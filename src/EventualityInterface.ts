import { BaseEvent } from './BaseEvent.js';
import { EventHandler } from './EventHandler.js';

/**
 * EventualityInterface defines the contract for the Eventuality event bus,
 * providing methods to publish, subscribe, unsubscribe, and request events.
 * All documentation and code comments must be in English as per copilot-instructions.md.
 * @template T The type of the event being published or subscribed to.
 * @template D The type of data associated with the event.
 */
export interface EventualityInterface {
  /**
   * Changes the debug mode of the Eventuality event bus. When debug mode is enabled,
   * additional logging and error handling may be performed. When disabled, the event bus
   * operates in a production mode with minimal logging and all memory used by debug
   * features is released. Is provided by the constructor and can be changed at runtime.
   */
  debugMode: boolean;

  /**
   * Time (in milliseconds) to wait between async calls to event handlers to prevent
   * blocking, with events processed sequentially from a FIFO queue. (`await new
   * Promise(resolve => setTimeout(resolve, this.waitTimeout));`) This timeout is applied
   * when processing events to allow other operations to continue while waiting for event
   * handlers to complete. The default value is 0, meaning no wait time. Is provided by
   * the constructor and can be changed at runtime.
   */
  waitTimeout: number;

  /**
   * Publishes an event to the specified clusters.
   * @param event The event type to publish.
   * @param clusters A set of cluster IDs to publish the event to.
   * @param persist If true, the event is persisted for new subscribers. If not specified,
   * uses the default from the constructor.
   * @return void
   * @throws {Error} If the event type is not supported or if the clusters are invalid.
   * @template T The type of the event being published.
   * @template D The type of data associated with the event.
   * @example
   * // Publish an event
   * eventuality.publish(new ExampleEvent1({ foo: 42 }), new Set(['cluster1', 'cluster2']), true);
   */
  publish<T extends BaseEvent<D>, D>(
    event: T,
    clusters?: Set<string>,
    persist?: boolean
  ): void;

  /**
   * Subscribes a handler to the specified clusters for a given event type.
   * @param event The event type to subscribe to.
   * @param handler The event handler function.
   * @param clusters A set of cluster IDs to subscribe to.
   * @return void
   * @throws {Error} If the event type is not supported or if the handler is already
   * subscribed.
   * @template T The type of the event being subscribed to.
   * @template D The type of data associated with the event.
   * @example
   * // Subscribe to an event
   * eventuality.subscribe(ExampleEvent1, handlerFunction, new Set(['cluster1', 'cluster2']));
   */
  subscribe<T extends BaseEvent<D>, D>(
    event: T,
    handler: EventHandler<D>,
    cluster?: string
  ): void;

  /**
   * Unsubscribes a handler from all clusters for a given event type.
   * @param event The event type to unsubscribe from.
   * @param handler The event handler function.
   * @return void
   * @throws {Error} If the handler is not found for the event type.
   * @template T The type of the event being unsubscribed from.
   * @template D The type of data associated with the event.
   * @example
   * // Unsubscribe from an event
   * eventuality.unsubscribe(ExampleEvent1, handlerFunction);
   */
  unsubscribe<T extends BaseEvent<D>, D>(
    event: T,
    handler: EventHandler<D>
  ): void;

  /**
   * Requests an event with a specific handler. This method subscribes the handler to the
   * event and publishes the request.
   * @param request The request event containing the target event and handler.
   * @param request.targetEvent The event type to request.
   * @param request.handler The handler function to process the event.
   * @param request.cluster The cluster where the event is being requested.
   * @param clustersToPublishRequestEvent A set of cluster IDs to publish the request to.
   * @return void
   * @throws {Error} If the request is invalid or if the event type is not supported.
   * @template T The type of the event being requested.
   * @template D The type of data associated with the event.
   */
  request<T extends BaseEvent<D>, D>(
    requestDetails: {
      targetEvent: T;
      handler: EventHandler<D>;
      cluster: string;
    },
    clustersToPublishRequestEvent: Set<string>
  ): void;
}
