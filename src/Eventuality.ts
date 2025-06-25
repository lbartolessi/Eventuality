import { EventualityInterface } from './EventualityInterface.js';
import { EventualityLogger } from './EventualityLogger.js';
import { EventualityOptions } from './EventualityOptions.js';
import {
  createTypedEvent,
  EventHandler,
  RequestPayload,
  TypedEvent,
  ErrorHandlingAction,
  LogContext,
} from './interfaces.js';

/**
 * Custom error class for Eventuality specific errors.
 */
class EventualityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventualityError';
    Object.setPrototypeOf(this, EventualityError.prototype);
  }
}

type HandlersMap = Map<string, Map<string, EventHandler<any>[]>>;
type PersistedEventsMap = Map<string, Map<string, { payload: any }>>;
type EventQueueItem = {
  eventDescriptor: TypedEvent<any>;
  payload: any;
  clusters: Set<string>;
};
type EventQueue = EventQueueItem[];

export class Eventuality implements EventualityInterface {
  // =================================================================
  // Properties
  // =================================================================

  // -----------------------------------------------------------------
  // Static Properties
  // -----------------------------------------------------------------

  public static readonly ALL_CLUSTERS = '*';
  public static readonly EFFECTIVE_TIMEOUT_DEFAULT = 30000;
  public static readonly NUMBER_TO_STRING_RADIX = 36;
  public static readonly RANDOM_SUFFIX_LENGTH = 7;
  private static _instance: EventualityInterface | null = null;

  // -----------------------------------------------------------------
  // Public Properties
  // -----------------------------------------------------------------

  public debugMode: boolean;
  public waitTimeout: number;

  // -----------------------------------------------------------------
  // Private Properties
  // -----------------------------------------------------------------

  private readonly handleError: (
    error: Error,
    eventDescriptor: TypedEvent<unknown>,
    handler?: EventHandler<unknown>,
    payload?: any
  ) => ErrorHandlingAction;
  private readonly handlerAsyncMode: 'individual' | 'batch' = 'individual';
  private readonly handlerMap: HandlersMap = new Map();
  private readonly persistedEvents: PersistedEventsMap = new Map();
  private eventQueue: EventQueueItem[] = []; //NOSONAR
  private isProcessingQueue = false;
  private readonly handlerIdToSubscriptionDetails: Map<
    symbol,
    { eventDescriptor: TypedEvent<any>; cluster: string }
  > = new Map();

  // =================================================================
  // Constructor & Static Methods
  // =================================================================

  private constructor(options: EventualityOptions) {
    const defaultOptions = {
      debugMode: false,
      handleError: (
        error: Error,
        eventDescriptor: TypedEvent<unknown>,
        handler: EventHandler<unknown>
      ) => handler?.onError,
      waitTimeout: 0,
    };
    this.debugMode = options.debugMode ?? defaultOptions.debugMode;
    this.waitTimeout = options.waitTimeout ?? defaultOptions.waitTimeout;

    const userHandleError = options.handleError ?? defaultOptions.handleError;
    this.handleError = (error, eventDescriptor, handler, payload) => {
      const action = userHandleError(error, eventDescriptor, handler!, payload);
      return action ?? handler!.onError ?? 'continue';
    };

    if (this.debugMode) {
      console.log(
        '📢 Eventuality instance created with options:',
        this.debugMode,
        this.waitTimeout,
        this.handlerAsyncMode
      );
    }
  }

  public static getInstance(
    options?: EventualityOptions
  ): EventualityInterface {
    if (!Eventuality._instance) {
      if (options) {
        Eventuality._instance = new Eventuality(options);
      } else {
        throw new EventualityError(
          'No options provided. `getInstance` needs an options parameter on the first call.'
        );
      }
    }
    return Eventuality._instance;
  }

  public static createInstance(options: EventualityOptions): Eventuality {
    return new Eventuality(options);
  }

  static createEventHandler<T>(
    fn: (payload: T) => void,
    instance: any,
    onError?: ErrorHandlingAction
  ): EventHandler<T> {
    const handler = ((payload: T) =>
      fn.call(instance, payload)) as EventHandler<T>;
    handler.id = Symbol('EventHandlerID');
    handler.className = instance.constructor.name;
    handler.tagName =
      typeof HTMLElement !== 'undefined' && instance instanceof HTMLElement
        ? instance.localName
        : null;
    if (onError) {
      handler.onError = onError;
    }
    return handler;
  }

  /**
   * Resets the singleton instance (for testing purposes only).
   */
  public static _resetInstance(): void {
    Eventuality._instance = null;
  }

  // =================================================================
  // Public API Methods
  // =================================================================

  public publish<PayloadType>(
    eventDescriptor: TypedEvent<PayloadType>,
    payload: PayloadType,
    clusters?: Set<string>
  ): void {
    const clustersToUse = clusters?.size
      ? clusters
      : new Set([Eventuality.ALL_CLUSTERS]);

    const allHandlersForEvent = this.handlerMap.get(eventDescriptor.eventType);
    for (const cluster of clustersToUse) {
      let hasSubscribers = false;
      if (allHandlersForEvent) {
        const clusterHandlersLength =
          allHandlersForEvent.get(cluster)?.length ?? 0;
        const allClustersHandlersLength =
          allHandlersForEvent.get(Eventuality.ALL_CLUSTERS)?.length ?? 0;
        hasSubscribers =
          clusterHandlersLength > 0 || allClustersHandlersLength > 0;
      }
      if (!hasSubscribers) {
        this.persistEventForCluster(eventDescriptor, payload, cluster);
      }
    }

    this.eventQueue.push({
      eventDescriptor: eventDescriptor,
      payload: payload,
      clusters: clustersToUse,
    });

    if (this.debugMode) {
      const logContext: LogContext = {
        action: 'publish',
        eventType: eventDescriptor.eventType,
        clusters: clustersToUse,
        hasSubscribers: this.hasAnySubscription(eventDescriptor, clustersToUse),
        payload,
      };
      EventualityLogger.log(logContext);
    }
    this.processQueue();
  }

  public subscribe<PayloadType>(
    eventDescriptor: TypedEvent<PayloadType>,
    handler: EventHandler<PayloadType>,
    cluster?: string
  ): void {
    const clusterKey = cluster ?? Eventuality.ALL_CLUSTERS;

    if (!handler || typeof handler.id !== 'symbol') {
      throw new EventualityError(
        'Invalid handler provided. It must be an object created by Eventuality.createEventHandler()'
      );
    }

    const existingSubscription = this.handlerIdToSubscriptionDetails.get(
      handler.id
    );

    if (existingSubscription) {
      if (
        existingSubscription.eventDescriptor.eventType !==
        eventDescriptor.eventType
      ) {
        const errorMsg = `Handler with ID ${handler.id.toString()} is already subscribed to event type "${
          existingSubscription.eventDescriptor.eventType
        }". A handler instance can only be registered for one event type.`;
        this.handleError(
          new EventualityError(errorMsg),
          eventDescriptor,
          handler as EventHandler<unknown>
        );
        return;
      }

      if (existingSubscription.cluster === clusterKey) {
        if (this.debugMode) {
          const logContext: LogContext = {
            action: 'subscribe',
            eventType: eventDescriptor.eventType,
            handler: {
              id: handler.id.toString(),
              className: handler.className,
              tagName: handler.tagName,
            },
            clusters: new Set([clusterKey]),
            message: 'Exact duplicate subscription. No action taken.',
          };
          EventualityLogger.log(logContext);
        }
        return;
      }

      const errorMsg = `Handler with ID ${handler.id.toString()} is already subscribed to event "${
        eventDescriptor.eventType
      }" on cluster "${
        existingSubscription.cluster
      }". Please unsubscribe first before subscribing to a different cluster ("${clusterKey}").`;
      this.handleError(
        new EventualityError(errorMsg),
        eventDescriptor,
        handler as EventHandler<unknown>
      );
      return;
    }

    if (this.debugMode) {
      const logContext: LogContext = {
        action: 'subscribe',
        eventType: eventDescriptor.eventType,
        handler: {
          id: handler.id.toString(),
          className: handler.className,
          tagName: handler.tagName,
        },
        clusters: new Set([clusterKey]),
      };
      EventualityLogger.log(logContext);
    }

    const handlerList = this.getOrCreateHandlerListForCluster<PayloadType>(
      eventDescriptor,
      clusterKey
    );
    handlerList.push(handler);

    this.handlerIdToSubscriptionDetails.set(handler.id, {
      eventDescriptor,
      cluster: clusterKey,
    });
    this.deliverAndClearPersistedEvent(
      eventDescriptor,
      clusterKey,
      handler as EventHandler<unknown>
    );
  }

  public unsubscribe<PayloadType>(
    eventDescriptor: TypedEvent<PayloadType>,
    handler: EventHandler<PayloadType>
  ): void {
    const eventType = eventDescriptor.eventType;
    if (!handler || typeof handler.id !== 'symbol') {
      throw new EventualityError('Invalid handler provided for unsubscribe.');
    }

    const subscriptionDetails = this.handlerIdToSubscriptionDetails.get(
      handler.id
    );

    if (!subscriptionDetails) {
      if (this.debugMode) {
        console.warn(
          `Unsubscribe called for a handler (ID: ${handler.id.toString()}) that is not subscribed.`
        );
      }
      return;
    }

    if (subscriptionDetails.eventDescriptor.eventType !== eventType) {
      const errorMsg = `Unsubscribe attempt for event "${eventType}" failed: Handler (ID: ${handler.id.toString()}) is subscribed to a different event "${
        subscriptionDetails.eventDescriptor.eventType
      }".`;
      this.handleError(
        new EventualityError(errorMsg),
        eventDescriptor,
        handler as EventHandler<unknown>
      );
      return;
    }

    this.removeHandlerFromClusterList(
      subscriptionDetails.eventDescriptor,
      subscriptionDetails.cluster,
      handler.id
    );

    this.handlerIdToSubscriptionDetails.delete(handler.id);
    this.cleanEmptyClusters(subscriptionDetails.eventDescriptor.eventType);

    if (this.debugMode) {
      const logContext: LogContext = {
        action: 'unsubscribe',
        eventType: eventDescriptor.eventType,
        handler: {
          id: handler.id.toString(),
          className: handler.className,
          tagName: handler.tagName,
        },
      };
      EventualityLogger.log(logContext);
    }
  }

  public request<TReqPayload extends RequestPayload<TResPayload>, TResPayload>(
    requestEventDescriptor: TypedEvent<TReqPayload>,
    payload: Omit<TReqPayload, 'replyTo'>,
    clustersToPublishRequest?: Set<string>,
    timeoutMs?: number
  ): Promise<TResPayload> {
    return new Promise<TResPayload>((resolve, reject) => {
      const replyEventType = `reply-to-${Date.now()}-${Math.random()
        .toString(Eventuality.NUMBER_TO_STRING_RADIX)
        .substring(2, 2 + Eventuality.RANDOM_SUFFIX_LENGTH)}`;
      const replyEventDescriptor =
        createTypedEvent<TResPayload>(replyEventType);

      const effectiveTimeout =
        timeoutMs ?? Eventuality.EFFECTIVE_TIMEOUT_DEFAULT;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const oneTimeHandler = Eventuality.createEventHandler<TResPayload>(
        (responsePayload: TResPayload) => {
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          this.unsubscribe(replyEventDescriptor, oneTimeHandler);
          resolve(responsePayload);
        },
        this
      );

      timeoutId = setTimeout(() => {
        this.unsubscribe(replyEventDescriptor, oneTimeHandler);
        reject(
          new EventualityError(
            `Request for event "${requestEventDescriptor.eventType}" timed out after ${effectiveTimeout}ms.`
          )
        );
      }, effectiveTimeout);

      this.subscribe(
        replyEventDescriptor,
        oneTimeHandler,
        (payload as TReqPayload).clusterTo
      );

      const fullPayload = payload as TReqPayload;
      fullPayload.replyTo = replyEventDescriptor;

      this.publish(
        requestEventDescriptor,
        fullPayload,
        clustersToPublishRequest
      );

      if (this.debugMode) {
        const logContext: LogContext = {
          action: 'request',
          eventType: requestEventDescriptor.eventType,
          clusters:
            clustersToPublishRequest ?? new Set([Eventuality.ALL_CLUSTERS]),
          payload: fullPayload,
        };
        EventualityLogger.log(logContext);
      }
    });
  }

  // =================================================================
  // Private Implementation Methods
  // =================================================================

  // -----------------------------------------------------------------
  // Publishing & Queue Processing Helpers
  // -----------------------------------------------------------------

  private processQueue(): void {
    if (this.isProcessingQueue || this.eventQueue.length === 0) {
      return;
    }
    this.isProcessingQueue = true;
    while (this.eventQueue.length > 0) {
      const item = this.eventQueue.shift();
      if (!item) {
        break;
      }
      const { eventDescriptor, payload, clusters } = item;
      const handlers = this.getMatchingHandlers(eventDescriptor, clusters);
      if (handlers.length > 0) {
        this.deliverEventToHandlers(eventDescriptor, handlers, payload);
      }
    }
    this.isProcessingQueue = false;
  }

  private deliverEventToHandlers(
    eventDescriptor: TypedEvent<any>,
    handlers: EventHandler<any>[],
    payload: any
  ): void {
    this.executeHandlersIndividually(eventDescriptor, handlers, payload);
  }

  private executeHandlersIndividually(
    eventDescriptor: TypedEvent<any>,
    handlers: EventHandler<any>[],
    payload: any
  ): void {
    for (const handler of handlers) {
      try {
        handler(payload);
        if (this.debugMode) {
          const logContext: LogContext = {
            action: 'handler_execution',
            status: 'success',
            eventType: eventDescriptor.eventType,
            handler: {
              id: handler.id.toString(),
              className: handler.className,
              tagName: handler.tagName,
            },
            payload,
          };
          EventualityLogger.log(logContext);
        }
      } catch (error) {
        // Log the error before handling it
        if (this.debugMode) {
          const logContext: LogContext = {
            action: 'handler_execution',
            status: 'error',
            eventType: eventDescriptor.eventType,
            handler: {
              id: handler.id.toString(),
              className: handler.className,
              tagName: handler.tagName,
            },
            payload,
            error: error as Error,
          };
          EventualityLogger.log(logContext);
        }
        if (
          this.handleHandlerError(
            error as Error,
            eventDescriptor,
            handler,
            payload
          )
        ) {
          // Stop processing if the error policy dictates it.
          return;
        }
      }
    }
  }

  /**
   * Handles errors thrown by event handlers and applies the appropriate error policy.
   * @returns true if event processing should stop, false otherwise.
   */
  private handleHandlerError(
    error: Error,
    eventDescriptor: TypedEvent<any>,
    handler: EventHandler<any>,
    payload: any
  ): boolean {
    const action = this.handleError(error, eventDescriptor, handler, payload);

    if (action === 'stop_event') {
      if (this.debugMode) {
        console.log(
          `Eventuality: Stopping further handler execution for event "${eventDescriptor.eventType}" due to error policy.`
        );
      }
      return true;
    }
    if (action === 'disable_handler') {
      if (this.debugMode) {
        console.log(
          `Eventuality: Disabling handler (ID: ${handler.id.toString()}) for event "${eventDescriptor.eventType}" due to error policy.`
        );
      }
      this.unsubscribe(eventDescriptor, handler);
    }
    return false;
  }

  private getMatchingHandlers(
    eventDescriptor: TypedEvent<any>,
    publishedClusters: Set<string>
  ): EventHandler<any>[] {
    const allSubscribedHandlersForEvent = this.handlerMap.get(
      eventDescriptor.eventType
    );
    if (!allSubscribedHandlersForEvent) {
      return [];
    }

    const resultingHandlers: EventHandler<any>[] = [];
    const addedHandlerIds = new Set<symbol>();

    const addHandlerIfNotPresent = (handler: EventHandler<any>) => {
      if (handler && handler.id && !addedHandlerIds.has(handler.id)) {
        resultingHandlers.push(handler);
        addedHandlerIds.add(handler.id);
      }
    };

    if (publishedClusters.has(Eventuality.ALL_CLUSTERS)) {
      for (const handlersInClusterArray of allSubscribedHandlersForEvent.values()) {
        handlersInClusterArray.forEach(addHandlerIfNotPresent);
      }
      return resultingHandlers;
    }

    const globalScopeHandlers = allSubscribedHandlersForEvent.get(
      Eventuality.ALL_CLUSTERS
    );
    if (globalScopeHandlers) {
      globalScopeHandlers.forEach(addHandlerIfNotPresent);
    }

    for (const specificCluster of publishedClusters) {
      const specificClusterHandlers =
        allSubscribedHandlersForEvent.get(specificCluster);
      if (specificClusterHandlers) {
        specificClusterHandlers.forEach(addHandlerIfNotPresent);
      }
    }
    return resultingHandlers;
  }

  private hasAnySubscription(
    eventDescriptor: TypedEvent<any>,
    clusters: Set<string>
  ): boolean {
    const eventMap = this.handlerMap.get(eventDescriptor.eventType);
    if (!eventMap) {
      return false;
    }

    if (clusters.has(Eventuality.ALL_CLUSTERS)) {
      for (const handlersArray of eventMap.values()) {
        if (handlersArray.length > 0) {
          return true;
        }
      }
      return false;
    }

    for (const specificPublishedCluster of clusters) {
      const handlersForCluster = eventMap.get(specificPublishedCluster);
      if (handlersForCluster && handlersForCluster.length > 0) {
        return true;
      }
    }

    const globalHandlers = eventMap.get(Eventuality.ALL_CLUSTERS);
    if (globalHandlers && globalHandlers.length > 0) {
      return true;
    }

    return false;
  }

  // -----------------------------------------------------------------
  // Persistence Helpers
  // -----------------------------------------------------------------

  private persistEventForCluster(
    eventDescriptor: TypedEvent<any>,
    payload: any,
    cluster: string
  ): void {
    let persistedForType = this.persistedEvents.get(eventDescriptor.eventType);

    if (!persistedForType) {
      persistedForType = new Map<string, { payload: any }>();
      this.persistedEvents.set(eventDescriptor.eventType, persistedForType);
    }

    persistedForType.set(cluster, { payload: payload });
  }

  private deliverAndClearPersistedEvent(
    eventDescriptor: TypedEvent<any>,
    clusterKey: string,
    handler: EventHandler<any>
  ): void {
    const persistedForType = this.persistedEvents.get(
      eventDescriptor.eventType
    );
    if (!persistedForType) {
      return;
    }

    const payloadsToDeliver: any[] = [];
    const clustersToDelete: string[] = [];

    const specificPersisted = persistedForType.get(clusterKey);
    if (specificPersisted) {
      payloadsToDeliver.push(specificPersisted.payload);
      clustersToDelete.push(clusterKey);
    }

    if (clusterKey !== Eventuality.ALL_CLUSTERS) {
      const wildcardPersisted = persistedForType.get(Eventuality.ALL_CLUSTERS);
      if (wildcardPersisted) {
        payloadsToDeliver.push(wildcardPersisted.payload);
        clustersToDelete.push(Eventuality.ALL_CLUSTERS);
      }
    }

    if (payloadsToDeliver.length === 0) {
      return;
    }

    for (const payload of payloadsToDeliver) {
      try {
        handler(payload);
      } catch (error) {
        this.handleError(error as Error, eventDescriptor, handler, payload);
      }
    }

    for (const cluster of clustersToDelete) {
      persistedForType.delete(cluster);
    }
    if (persistedForType.size === 0) {
      this.persistedEvents.delete(eventDescriptor.eventType);
    }
  }

  // -----------------------------------------------------------------
  // Subscription & Handler Management Helpers
  // -----------------------------------------------------------------

  private getOrCreateHandlerListForCluster<PayloadType>(
    eventDescriptor: TypedEvent<PayloadType>,
    clusterKey: string
  ): EventHandler<PayloadType>[] {
    let clusterMapForEvent = this.handlerMap.get(eventDescriptor.eventType) as
      | Map<string, EventHandler<PayloadType>[]>
      | undefined;

    if (!clusterMapForEvent) {
      clusterMapForEvent = new Map<string, EventHandler<PayloadType>[]>();
      this.handlerMap.set(
        eventDescriptor.eventType,
        clusterMapForEvent as Map<string, EventHandler<any>[]>
      );
    }

    let handlerList = clusterMapForEvent.get(clusterKey);

    if (!handlerList) {
      handlerList = [];
      clusterMapForEvent.set(clusterKey, handlerList);
    }

    return handlerList;
  }

  private removeHandlerFromClusterList<PayloadType>(
    eventDescriptor: TypedEvent<PayloadType>,
    clusterKey: string,
    handlerId: symbol
  ): void {
    const clusterMapForEvent = this.handlerMap.get(eventDescriptor.eventType);
    if (!clusterMapForEvent) {
      return;
    }

    const handlerList = clusterMapForEvent.get(clusterKey);
    if (!handlerList) {
      return;
    }

    const handlerIndex = handlerList.findIndex(
      (handler) => handler.id === handlerId
    );

    if (handlerIndex !== -1) {
      handlerList.splice(handlerIndex, 1);
    }
  }

  private cleanEmptyClusters(eventType: string): void {
    const eventMap = this.handlerMap.get(eventType);
    if (!eventMap) {
      return;
    }
    for (const [clusterKey, handlersMap] of eventMap.entries()) {
      if (handlersMap.length === 0) {
        eventMap.delete(clusterKey);
      }
    }
    if (eventMap.size === 0) {
      this.handlerMap.delete(eventType);
    }
  }
}
