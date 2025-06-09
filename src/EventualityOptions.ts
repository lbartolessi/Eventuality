import { BaseEvent } from './BaseEvent.js';

/**
 * Options for configuring an Eventuality instance.
 */
export interface EventualityOptions {
  /** Initial debug mode. Default: false. */
  debugMode?: boolean;
  /** Default persistence for publish. Default: false. */
  defaultPersist?: boolean;
  /** Custom error handler. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleError?: (error: Error, event: BaseEvent<any>) => void;
  /** Initial delay (ms) in event processing loop. Default: 0. */
  waitTimeout?: number;
}
