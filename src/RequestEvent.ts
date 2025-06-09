/**
 * Interface for a request event that includes a handler.
 * @template D The type of data associated with the event.
 */

import { BaseEvent } from './BaseEvent.js';
import { EventHandler } from './EventHandler.js';

export interface RequestEventData<D> {
  /** The type of event being requested. */
  targetEvent: BaseEvent<D>;
  /** The handler function to process the event. */
  handler: EventHandler<D>;
  /** The cluster where the event is being requested. */
  cluster: string;
}

export interface RequestEvent<D> extends BaseEvent<RequestEventData<D>> {
  eventType: 'REQUEST_EVENT';
  data: RequestEventData<D>;
}
