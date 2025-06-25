// EventualityInterface
import { EventHandler, RequestPayload, TypedEvent } from './interfaces.js';

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
   * @template PayloadType The type of the data associated with the event.
   * @param eventDescriptor The typed descriptor for the event to publish.
   * @param payload The actual data/payload of the event.
   * @param clusters A set of cluster IDs to publish the event to.
   * @return void
   * @throws {Error} If the event type is not supported or if the clusters are invalid.
   * @example
   * // Publish an event
   * eventuality.publish(ExampleEvent1Descriptor, { foo: 42 }, new Set(['cluster1', 'cluster2']), true);
   */
  publish<PayloadType>(
    eventDescriptor: TypedEvent<PayloadType>,
    payload: PayloadType,
    clusters?: Set<string>,
  ): void;

  /**
   * Subscribes a handler to the specified clusters for a given event type.
   * @param eventDescriptor The typed descriptor for the event to subscribe to.
   * @param handler The event handler function.
   * @param cluster A cluster ID to subscribe to. Defaults to all clusters if not specified.
   * @return void
   * @throws {Error} If the event type is not supported or if the handler is already
   * subscribed.
   * @template PayloadType The type of the data the handler expects.
   * @example
   * // Subscribe to an event
   * eventuality.subscribe(ExampleEvent1, handlerFunction, new Set(['cluster1', 'cluster2']));
   */
  subscribe<PayloadType>(
    eventDescriptor: TypedEvent<PayloadType>,
    handler: EventHandler<PayloadType>,
    cluster?: string
  ): void;

  /**
   * Unsubscribes a handler from all clusters for a given event type.
   * @param eventDescriptor The typed descriptor for the event to unsubscribe from.
   * @param handler The event handler function.
   * @return void
   * @throws {Error} If the handler is not found for the event type.
   * @template PayloadType The type of the data associated with the event.
   * @example
   * // Unsubscribe from an event
   * eventuality.unsubscribe(ExampleEvent1, handlerFunction);
   */
  unsubscribe<PayloadType>(
    eventDescriptor: TypedEvent<PayloadType>,
    handler: EventHandler<PayloadType>
  ): void;

  /**
   * Publishes a request event and returns a Promise that resolves with the payload
   * of the corresponding response event.
   *
   * The EventBus internally creates a unique, temporary reply channel and subscribes to it.
   * The payload of the request (`payload`) should contain any necessary information
   * for the responder, including where the responder should publish the response event
   * (e.g., a target cluster for the response).
   *
   * @template TReqPayload The type of the request payload provided by the caller.
   *                       This payload should include information for the responder,
   *                       such as the target cluster for the response.
   * @template TResPayload The type of the expected response payload.
   *
   * @param requestEventDescriptor The TypedEvent descriptor for the request being made.
   * @param payload The payload for the request.
   * @param clustersToPublishRequest Optional. A set of cluster names to which the request event
   *                                 will be published. Defaults to EventBus.ALL_CLUSTERS if undefined.
   * @param timeoutMs Optional. A timeout in milliseconds to wait for the response.
   *                  If the timeout is reached before a response is received, the Promise will be rejected.
   *                  Uses the EventBus's default timeout if not specified.
   * @returns A Promise that resolves with the `TResPayload` when the response event is received,
   *          or rejects on timeout or error.
   */
  request<TReqPayload extends RequestPayload<TResPayload>, TResPayload>(
    requestEventDescriptor: TypedEvent<TReqPayload>,
    payload: TReqPayload,
    clustersToPublishRequest?: Set<string>,
    timeoutMs?: number
  ): Promise<TResPayload>;
}
