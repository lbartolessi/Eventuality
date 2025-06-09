/**
 * Base interface for all events.
 * @template T The type of the event data.
 */
export interface BaseEvent<T> {
  eventType: string;
  data: T;
}
