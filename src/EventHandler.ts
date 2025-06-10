
/**
 * Event handler interface for Eventuality.
 * @template T The type of the event data.
 */
export interface EventHandler<T> {
  (payload: T): void;
  id: symbol;
  className: string;
  tagName: string | null;
}


