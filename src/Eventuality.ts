import { BaseEvent } from './BaseEvent.js';
import { EventHandler } from './EventHandler.js';
import { EventualityInterface } from './EventualityInterface.js';
import { EventualityOptions } from './EventualityOptions.js';
import { RequestEvent } from './RequestEvent.js';

/**
 * Custom error class for Eventuality specific errors. This class is not exported and is
 * intended for internal use.
 */
export class EventualityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EventualityError';
    // Ensure the prototype chain is correctly set up for ES5+
    Object.setPrototypeOf(this, EventualityError.prototype);
  }
}

/**
 * Placeholder implementation of the Eventuality event bus. This class is not exported and
 * serves to satisfy the EventualityInterface for type checking and example development.
 */

class EventualityLogger {
  private static getEmojiMode(
    mode: 'PUB' | 'SUB' | 'COG' | 'UNS' | 'REQ'
  ): string {
    switch (mode) {
      case 'PUB':
        return '📢';
      case 'SUB':
        return '👂';
      case 'COG':
        return '⚙️';
      case 'UNS':
        return '🔕';
      case 'REQ':
        return '🙋';
      default:
        return '';
    }
  }
  private static getEmojiState(state: 'LOST' | 'FOUND' | 'SYNC'): string {
    switch (state) {
      case 'LOST':
        return '🏝️';
      case 'FOUND':
        return '🛟';
      default:
        return '⏰';
    }
  }
  private static getMaxLineLength(text: string): number {
    const lines = text.split('\n');
    return lines.reduce((max, line) => Math.max(max, line.length), 0);
  }
  private static logWithBox(
    mode: 'PUB' | 'SUB' | 'COG' | 'UNS' | 'REQ',
    state: 'LOST' | 'FOUND' | 'SYNC',
    eventType: string,
    clusters?: Set<string>,
    className?: string,
    tagName?: string,
    data?: unknown
  ) {
    const timestamp = new Date().toISOString();
    const emojiMode = EventualityLogger.getEmojiMode(mode);
    const emojiState = EventualityLogger.getEmojiState(state);
    const BOX_COLOR = '\x1b[36m';
    const RESET_COLOR = '\x1b[0m';
    const coreLogText1 = `[${timestamp}] [${mode} ${emojiMode}] [${state} ${emojiState}]`;
    const eventTypePart = `[${eventType}]`;
    const clustersPart =
      clusters && clusters.size > 0
        ? ` [${Array.from(clusters).join(', ')}]`
        : '';
    const classNamePart = className ? ` ${className}` : '';
    const tagNamePart = tagName ? ` <${tagName}>` : '';
    const coreLogText2 = eventTypePart + clustersPart;
    const coreLogText3 = classNamePart + tagNamePart;
    const logDataString = JSON.stringify(data, null, 2);
    const maxContentLength = Math.max(
      coreLogText1.length,
      coreLogText2.length,
      coreLogText3.length,
      logDataString ? EventualityLogger.getMaxLineLength(logDataString) : 0
    );
    const horizontalBorderLine = '─'.repeat(maxContentLength);
    const topBorder = `${BOX_COLOR}┌${horizontalBorderLine}┐${RESET_COLOR}`;
    const middleBorder = `${BOX_COLOR}├${'─'.repeat(maxContentLength)}┤${RESET_COLOR}`;
    const bottomBorder = `${BOX_COLOR}└${horizontalBorderLine}┘${RESET_COLOR}`;
    console.log(topBorder);
    console.log(`${BOX_COLOR}│${RESET_COLOR}${coreLogText1}`);
    console.log(`${BOX_COLOR}│${RESET_COLOR}${coreLogText2}`);
    console.log(`${BOX_COLOR}│${RESET_COLOR}${coreLogText3}`);
    if (logDataString && logDataString !== '{}') {
      console.log(middleBorder);
      const lines = logDataString.split('\n');
      for (const line of lines) {
        console.log(`${BOX_COLOR}│${RESET_COLOR}${line}`);
      }
    }
    console.log(bottomBorder);
  }
  public static publishLog<T extends BaseEvent<D>, D>(
    event: T,
    clusters: Set<string>,
    hasSubscriptions: boolean
  ): void {
    EventualityLogger.logWithBox(
      'PUB',
      hasSubscriptions ? 'SYNC' : 'LOST',
      event.eventType,
      clusters,
      undefined,
      undefined,
      event.data
    );
  }
  public static subscribeLog<T extends BaseEvent<D>, D>(
    event: T,
    handler: EventHandler<D>,
    clusters: Set<string>
  ): void {
    EventualityLogger.logWithBox(
      'SUB',
      'SYNC',
      event.eventType,
      clusters,
      handler.className,
      handler.tagName,
      event.data
    );
  }
  public static requestLog<D>(
    request: RequestEvent<D>,
    clusters: Set<string>
  ): void {
    EventualityLogger.logWithBox(
      'REQ',
      'SYNC',
      request.data.targetEvent.eventType,
      clusters,
      request.data.handler.className,
      request.data.handler.tagName,
      request.data.targetEvent.data
    );
  }
  public static unsubscribeLog<T extends BaseEvent<D>, D>(
    event: T,
    handler: EventHandler<D>
  ): void {
    EventualityLogger.logWithBox(
      'UNS',
      'SYNC',
      event.eventType,
      undefined,
      handler.className,
      handler.tagName
    );
  }
  public static eventHandlerLog<T extends BaseEvent<D>, D>(
    event: T,
    handler: EventHandler<D>
  ): void {
    EventualityLogger.logWithBox(
      'COG',
      'SYNC',
      event.eventType,
      undefined,
      handler.className,
      handler.tagName,
      event.data
    );
  }
}

type HandlerMap<D> = Map<symbol, EventHandler<D>>;
type ClusterMap<D> = Map<string, HandlerMap<D>>;
type Subscriptions = Map<string, ClusterMap<unknown>>;
type PersistedEvents = Map<string, Map<string, BaseEvent<unknown>>>;
type EventQueueItem = {
  event: BaseEvent<unknown>;
  clusters: Set<string>;
  persist: boolean;
};

export class Eventuality implements EventualityInterface {
  // Singleton instance
  private static _instance: EventualityInterface | null = null;

  public debugMode: boolean;
  public waitTimeout: number;
  private readonly defaultPersist: boolean;
  private readonly handleError: (
    error: Error,
    event: BaseEvent<unknown>,
    handler?: EventHandler<unknown>
  ) => void;
  private readonly handlerAsyncMode: 'individual' | 'batch' = 'individual';

  private readonly subscriptions: Subscriptions = new Map();
  private readonly persistedEvents: PersistedEvents = new Map();
  // eventQueue no puede ser readonly porque se usan push y shift para la cola FIFO (ver Decisión Técnica #8 y #10)
  // eslint-disable-next-line @typescript-eslint/prefer-readonly
  private eventQueue: EventQueueItem[] = [];
  private processing = false;

  private constructor(options?: EventualityOptions) {
    const defaultOptions: EventualityOptions = {
      debugMode: false,
      defaultPersist: false,
      handleError: (error: Error, event: BaseEvent<unknown>) => {
        if (this.debugMode) {
          // eslint-disable-next-line no-console
          console.error(
            `Eventuality unhandled error during event ${event.eventType}:`,
            error
          );
        }
      },
      waitTimeout: 0,
    };
    this.debugMode = options?.debugMode ?? defaultOptions.debugMode!;
    this.waitTimeout = options?.waitTimeout ?? defaultOptions.waitTimeout!;
    this.defaultPersist =
      options?.defaultPersist ?? defaultOptions.defaultPersist!;

    const userHandleError = options?.handleError;
    this.handleError = (error, event, handler) => {
      if (typeof userHandleError === 'function') {
        // @ts-expect-error: el usuario puede ignorar handler
        userHandleError(error, event, handler);
      } else {
        defaultOptions.handleError!(error, event);
      }
    };
    if ((options as Record<string, unknown>)?.handlerAsyncMode === 'batch') {
      this.handlerAsyncMode = 'batch';
    }
    if (this.debugMode) {
      // eslint-disable-next-line no-console
      console.log(
        '📢 Eventuality instance created with options:',
        this.debugMode,
        this.waitTimeout,
        this.defaultPersist,
        this.handlerAsyncMode
      );
    }
  }

  public publish<T extends BaseEvent<D>, D>(
    event: T,
    clusters?: Set<string>,
    persist?: boolean
  ): void {
    const clustersToUse = clusters?.size ? clusters : new Set(['*']);
    const shouldPersist = persist ?? this.defaultPersist;
    this.eventQueue.push({
      event,
      clusters: clustersToUse,
      persist: shouldPersist,
    });
    if (this.debugMode) {
      const hasSubs = this.hasAnySubscription(event.eventType, clustersToUse);
      EventualityLogger.publishLog(event, clustersToUse, Boolean(hasSubs));
    }
    this.processQueue();
  }

  public subscribe<T extends BaseEvent<D>, D>(
    event: T,
    handler: EventHandler<D>,
    cluster?: string
  ): void {
    const eventType = event.eventType;
    const clusterKey = cluster ?? '*';
    this.validateHandler(handler);
    const clusterMap = this.getOrCreateClusterMap<D>(eventType, clusterKey);
    if (clusterMap.has(handler.id)) {
      if (this.debugMode) {
        EventualityLogger.subscribeLog(event, handler, new Set([clusterKey]));
      }
      return;
    }
    if (this.isHandlerRegisteredElsewhere(handler.id, eventType)) {
      throw new EventualityError(
        'A handler instance can only be registered for one eventType.'
      );
    }
    clusterMap.set(handler.id, handler);
    if (this.debugMode) {
      EventualityLogger.subscribeLog(event, handler, new Set([clusterKey]));
    }
    this.deliverPersistedEventsToHandler(
      eventType,
      clusterKey,
      handler as EventHandler<unknown>
    );
  }

  public unsubscribe<T extends BaseEvent<D>, D>(
    event: T,
    handler: EventHandler<D>
  ): void {
    const eventType = event.eventType;
    const found = this.removeHandlerFromAllClusters(eventType, handler, event);
    if (!found) {
      throw new EventualityError(
        'Handler not found for eventType during unsubscribe.'
      );
    }
  }

  private removeHandlerFromAllClusters<D>(
    eventType: string,
    handler: EventHandler<D>,
    event: BaseEvent<D>
  ): boolean {
    let found = false;
    const eventMap = this.subscriptions.get(eventType);
    if (eventMap) {
      for (const handlersMap of eventMap.values()) {
        const deleted = handlersMap.delete(handler.id);
        if (deleted) {
          found = true;
          this.logUnsubscribeIfDebug(event, handler);
        }
      }
      this.cleanEmptyClusters(eventType);
    }
    return found;
  }

  private logUnsubscribeIfDebug<D>(
    event: BaseEvent<D>,
    handler: EventHandler<D>
  ): void {
    if (this.debugMode) {
      EventualityLogger.unsubscribeLog(event, handler);
    }
  }

  public request<T extends BaseEvent<D>, D>(
    requestDetails: {
      targetEvent: T;
      handler: EventHandler<D>;
      cluster: string;
    },
    clustersToPublishRequestEvent: Set<string>
  ): void {
    this.subscribe(
      requestDetails.targetEvent,
      requestDetails.handler,
      requestDetails.cluster
    );
    const requestEvent: RequestEvent<D> = {
      eventType: 'REQUEST_EVENT',
      data: {
        targetEvent: requestDetails.targetEvent,
        handler: requestDetails.handler,
        cluster: requestDetails.cluster,
      },
    };
    this.publish(requestEvent, clustersToPublishRequestEvent, true);
    if (this.debugMode) {
      EventualityLogger.requestLog(requestEvent, clustersToPublishRequestEvent);
    }
  }

  // Métodos privados requeridos
  private validateHandler<D>(handler: EventHandler<D>): void {
    if (!handler || typeof handler !== 'function' || !handler.id) {
      throw new EventualityError(
        'Handler must be a function with a unique id (Symbol).'
      );
    }
  }

  private getOrCreateClusterMap<D>(
    eventType: string,
    clusterKey: string
  ): HandlerMap<D> {
    let eventMap = this.subscriptions.get(eventType);
    if (!eventMap) {
      eventMap = new Map();
      this.subscriptions.set(
        eventType,
        eventMap as unknown as ClusterMap<unknown>
      );
    }
    let clusterMap = eventMap.get(clusterKey) as HandlerMap<D> | undefined;
    if (!clusterMap) {
      clusterMap = new Map();
      eventMap.set(clusterKey, clusterMap as unknown as HandlerMap<unknown>);
    }
    return clusterMap;
  }

  private handlerExistsInAnyCluster(
    clustersMap: Map<string, Map<symbol, EventHandler<unknown>>>,
    handlerId: symbol
  ): boolean {
    for (const handlersMap of clustersMap.values()) {
      if (handlersMap.has(handlerId)) {
        return true;
      }
    }
    return false;
  }

  private isHandlerRegisteredElsewhere(
    handlerId: symbol,
    eventType: string
  ): boolean {
    for (const [evt, clustersMap] of this.subscriptions.entries()) {
      if (
        evt !== eventType &&
        this.handlerExistsInAnyCluster(clustersMap, handlerId)
      ) {
        return true;
      }
    }
    return false;
  }

  private cleanEmptyClusters(eventType: string): void {
    const eventMap = this.subscriptions.get(eventType);
    if (!eventMap) {
      return;
    }
    for (const [clusterKey, handlersMap] of eventMap.entries()) {
      if (handlersMap.size === 0) {
        eventMap.delete(clusterKey);
      }
    }
    if (eventMap.size === 0) {
      this.subscriptions.delete(eventType);
    }
  }

  private getMatchingHandlers(
    eventType: string,
    clusters: Set<string>
  ): Array<{ handler: EventHandler<unknown>; cluster: string }> {
    const eventMap = this.subscriptions.get(eventType);
    if (!eventMap) {
      return [];
    }

    const handlers: Array<{ handler: EventHandler<unknown>; cluster: string }> =
      [];
    const addHandlers = (map: HandlerMap<unknown>, cluster: string) => {
      for (const handler of map.values()) {
        handlers.push({ handler, cluster });
      }
    };
    for (const cluster of clusters) {
      const clusterMap = eventMap.get(cluster);
      if (clusterMap) {
        addHandlers(clusterMap, cluster);
      }
      const wildcardMap = eventMap.get('*');
      if (wildcardMap) {
        addHandlers(wildcardMap, '*');
      }
    }
    if (clusters.has('*')) {
      for (const [cl, clusterMap] of eventMap.entries()) {
        addHandlers(clusterMap, cl);
      }
    }
    return handlers;
  }

  private hasAnySubscription(
    eventType: string,
    clusters: Set<string>
  ): boolean {
    const eventMap = this.subscriptions.get(eventType);
    if (!eventMap) {
      return false;
    }
    for (const cluster of clusters) {
      if (eventMap.has(cluster)) {
        return true;
      }
    }
    return false;
  }

  private processQueue(): void {
    if (this.processing) {
      return;
    }
    this.processing = true;
    while (this.eventQueue.length > 0) {
      const item = this.eventQueue.shift();
      if (!item) {
        break;
      }
      const { event, clusters, persist } = item;
      const handlers = this.getMatchingHandlers(event.eventType, clusters);
      if (handlers.length > 0) {
        this.deliverEventToHandlers(event, handlers);
      }
      if (persist) {
        this.persistEvent(event, clusters);
      }
    }
    this.processing = false;
  }

  private deliverPersistedEventsToHandler(
    eventType: string,
    clusterKey: string,
    handler: EventHandler<unknown>
  ): void {
    const persistedEventsMap = this.persistedEvents.get(eventType);
    if (persistedEventsMap) {
      const event = persistedEventsMap.get(clusterKey);
      if (event) {
        handler(event.data);
      }
    }
  }

  private persistEvent<T extends BaseEvent<unknown>>(
    event: T,
    clusters: Set<string>
  ): void {
    const eventType = event.eventType;
    const persistedEventsMap = this.persistedEvents.get(eventType);
    if (persistedEventsMap) {
      for (const cluster of clusters) {
        persistedEventsMap.set(cluster, event);
      }
    } else {
      const newPersistedEventsMap = new Map<string, BaseEvent<unknown>>();
      for (const cluster of clusters) {
        newPersistedEventsMap.set(cluster, event);
      }
      this.persistedEvents.set(eventType, newPersistedEventsMap);
    }
  }

  private deliverEventToHandlers(
    event: BaseEvent<unknown>,
    handlers: Array<{ handler: EventHandler<unknown>; cluster: string }>
  ): void {
    if (this.handlerAsyncMode === 'individual') {
      this.executeHandlersIndividually(event, handlers);
    } else {
      this.executeHandlersBatch(event, handlers);
    }
  }

  private executeHandlersIndividually(
    event: BaseEvent<unknown>,
    handlers: Array<{ handler: EventHandler<unknown>; cluster: string }>
  ): void {
    for (const { handler } of handlers) {
      try {
        handler(event.data);
      } catch (error) {
        this.handleError(error as Error, event, handler);
      }
    }
  }

  private executeHandlersBatch(
    event: BaseEvent<unknown>,
    handlers: Array<{ handler: EventHandler<unknown>; cluster: string }>
  ): void {
    const grouped: Record<string, EventHandler<unknown>[]> = {};
    for (const { handler, cluster } of handlers) {
      if (!grouped[cluster]) {
        grouped[cluster] = [];
      }
      grouped[cluster].push(handler);
    }
    for (const cluster in grouped) {
      if (Object.hasOwn(grouped, cluster)) {
        this.executeHandlersForCluster(grouped[cluster], event);
      }
    }
  }

  private executeHandlersForCluster(
    handlers: EventHandler<unknown>[],
    event: BaseEvent<unknown>
  ): void {
    for (const handler of handlers) {
      try {
        handler(event.data);
      } catch (error) {
        this.handleError(error as Error, event, handler);
      }
    }
  }

  public static getInstance(
    options?: EventualityOptions
  ): EventualityInterface {
    Eventuality._instance ??= new Eventuality(options);
    return Eventuality._instance;
  }

  public static createInstance(options?: EventualityOptions): Eventuality {
    // For testing or explicit new instance (not singleton)
    return new Eventuality(options);
  }

  /**
   * Resetea la instancia singleton (solo para testing).
   */
  public static _resetInstance(): void {
    Eventuality._instance = null;
  }
}
