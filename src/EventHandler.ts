
/**
 * Event handler interface for Eventuality.
 * @template T The type of the event data.
 */
export interface EventHandler<T> {
  /**
   * Handles an event payload.
   * @param payload The event data.
   */
  (payload: T): void;
  /** Unique identifier for the handler instance. */
  id: symbol;
  /** Name of the class or component. */
  className: string;
  /** Custom element tag name, if applicable. */
  tagName?: string;
}
