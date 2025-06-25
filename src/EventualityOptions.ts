import { ErrorHandlingAction, EventHandler, TypedEvent } from "./interfaces.js";

/**
 * Options for configuring an Eventuality instance.
 */
export interface EventualityOptions {
  /** Initial debug mode. Default: false. */
  debugMode?: boolean;
  /** Custom error handler. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleError?: (
    error: Error,
    event: TypedEvent<any>,
    handler: EventHandler<any>,
    payload: any
  ) => ErrorHandlingAction | undefined;
  /** Initial delay (ms) in event processing loop. Default: 0. */
  waitTimeout?: number;
}
