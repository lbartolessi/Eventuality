/**
 * Describes a typed event, carrying its payload type `PayloadType`.
 * The `eventType` serves as the unique identifier for the event type.
 * @template PayloadType The type of the event data.
 */
export interface TypedEvent<PayloadType> {
  /** A unique name for the event, serving as its primary identifier. */
  readonly eventType: string;
  /** A "phantom type" to carry the payload's type information, making event descriptors with different payloads incompatible. */
  readonly __payloadType?: PayloadType;
}
/**
 * Defines the structured context for all log entries.
 */
export interface LogContext {
  action:
    | 'publish'
    | 'subscribe'
    | 'unsubscribe'
    | 'request'
    | 'handler_execution'
    | 'info';
  eventType: string;
  payload?: any;
  handler?: { id: string; className: string; tagName: string | null };
  clusters?: Set<string>;
  status?: 'success' | 'error' | 'info';
  error?: Error;
  message?: string;
  hasSubscribers?: boolean;
}

/**
 * Factory to create TypedEvent descriptors.
 * @param eventType Optional name for the event, useful for debugging.
 * @template PayloadType The type of the event data.
 */
export function createTypedEvent<PayloadType>(
  eventType: string
): TypedEvent<PayloadType> {
  // _brand is only for compile-time type branding, not for runtime use
  return {
    eventType,
  };
}

/**
 * Base interface for request payloads.
 * It requires a 'replyTo' property specifying the TypedEvent descriptor for the response.
 * and 'clusterTo' specifying the cluster for the response event.
 *
 * @param replyTo The TypedEvent descriptor that will be used to publish the response.
 * @param clusterTo Cluster to send the requested event
 * @template TResponsePayload The type of the expected response payload.
 */
export interface RequestPayload<TResponsePayload> {
  replyTo: TypedEvent<TResponsePayload>;
  clusterTo: string;
}

/**
 * Defines the possible actions the Eventuality bus can take after an unhandled error occurs in a handler.
 */
export type ErrorHandlingAction = 'continue' | 'stop_event' | 'disable_handler';

/**
 * Event handler interface for Eventuality.
 * It's a callable object that also carries metadata.
 * @template PayloadType The type of the event data.
 */
export interface EventHandler<PayloadType> {
  /**
   * The function to be executed when the event is received.
   * Can be synchronous or asynchronous.
   * @param payload The data payload of the event.
   */

  /**
   * A unique symbol to identify this specific handler instance.
   * Crucial for reliable unsubscription.
   */
  (payload: PayloadType): void | Promise<void>;
  id: symbol;

  /**
   * The class name of the component or entity that created this handler.
   * Useful for debugging.
   */
  className: string;

  /**
   * The tag name if the handler is associated with a Web Component or DOM element.
   * Useful for debugging.
   */
  tagName: string | null;

  onError: ErrorHandlingAction;
}
