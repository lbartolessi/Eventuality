# Eventuality - Detailed Error Handling Strategy

## 1. Introduction

### 1.1 Purpose

This document outlines a comprehensive error handling strategy for the Eventuality system. The goal is to ensure robustness, predictability, and debuggability by defining how errors are detected, logged, reported, and managed throughout the system. This strategy aims to prevent individual component failures from cascading and to provide developers with clear mechanisms for addressing issues.

### 1.2 Scope

This strategy covers errors originating from:

- System initialization and configuration.
- API usage (publish, subscribe, unsubscribe, request).
- Event handler execution.
- Internal operations (event queuing, persistence - at an abstract level).

It leverages existing components like `EventualityError`, `EventualityLogger`, and the `handleError` option.

## 2. Goals of Error Handling

- **Robustness:** The system should remain operational and stable even when individual handlers or operations encounter errors.
- **Isolation:** Errors within one event handler should not affect other handlers or the overall event bus processing.
- **Transparency:** Provide clear information about errors to developers for debugging and resolution.
- **Configurability:** Allow users to define custom error handling logic.
- **Maintainability:** Implement a consistent error handling approach across the system.

## 3. Error Sources and Types

### 3.1 Configuration Errors

- **Source:** Invalid `EventualityOptions` provided during `Eventuality.getInstance()`.
- **Type:** Typically `EventualityError`.
- **Examples:** Invalid `waitTimeout` value, incorrect type for `defaultPersist`.

### 3.2 API Usage Errors

- **Source:** Incorrect parameters or state when calling `publish`, `subscribe`, `unsubscribe`, or `request`.
- **Type:** `EventualityError` or standard JavaScript errors (e.g., `TypeError`).
- **Examples:**
  - `publish`: Publishing a malformed event object (e.g., missing `eventType`).
  - `subscribe`: Providing a non-function as a handler (if not caught by TypeScript).
  - `unsubscribe`: Attempting to unsubscribe a handler that was never subscribed.
  - `request`: Invalid `requestDetails` structure.

### 3.3 Event Handler Execution Errors

- **Source:** Errors thrown by user-provided event handler functions.
- **Type:** Any error type thrown by the user's code (standard `Error`, custom errors, etc.).
- **Examples:** Null pointer exceptions, failed API calls within a handler, business logic violations.

### 3.4 Internal System Errors

- **Source:** Unexpected issues within Eventuality's internal logic (though less likely with robust implementation).
- **Type:** `EventualityError`.
- **Examples:**
  - Issues with the internal event queue management (conceptual, as it's an in-memory array).
  - Issues with the persisted events store management (conceptual, as it's an in-memory `Map`).

### 3.5 `EventualityError`

- A custom error class (`EventualityError extends Error`) used to signify errors originating specifically from the Eventuality system, making them distinguishable from general JavaScript errors or errors from user code.

## 4. Error Detection Mechanisms

### 4.1 Compile-Time Type Checking

- **Mechanism:** TypeScript's static type system.
- **Purpose:** Catch many potential errors related to incorrect types for API parameters, event structures, and handler signatures during development.

### 4.2 Runtime Validations

- **Mechanism:** Explicit checks within Eventuality's methods.
- **Purpose:** Catch errors that cannot be caught at compile-time.
- **Examples:**
  - Validating critical options in `EventualityOptions`.
  - Checking the basic structure of `BaseEvent` objects during `publish` (e.g., presence of `eventType`).
  - Verifying handler function types if necessary (though TypeScript usually covers this).

### 4.3 `try...catch` Blocks

- **Mechanism:** Standard JavaScript `try...catch` blocks.
- **Purpose:**
  - **Handler Execution:** Crucially, each event handler invocation (or batch, depending on `handlerAsyncMode`) MUST be wrapped in a `try...catch` block to isolate failures (FR1.6.6, C8).
  - **Internal Operations:** Critical internal operations might also use `try...catch` for graceful failure or logging.

## 5. Error Logging

### 5.1 `EventualityLogger`

- **Role:** The primary component for logging errors and other debug information.
- **Control:** Logging is enabled/disabled via `EventualityOptions.debugMode` or the dynamic `Eventuality.debugMode` property.

### 5.2 Information to Log

When an error is caught and logged, the following information SHOULD be included:

- Timestamp.
- Error type (e.g., `EventualityError`, `TypeError`).
- Error message.
- Stack trace (if available).
- Contextual information:
  - For handler errors: `eventType`, `event.data` (potentially summarized/truncated), `handler.className`, `handler.tagName`.
  - For API errors: Method name, parameters involved.
- Severity (e.g., ERROR, WARNING).

### 5.3 Logging Points

- Errors caught during handler execution.
- Errors caught during API method calls.
- Significant internal state issues (if any).
- Warnings for potentially problematic configurations or usage patterns (e.g., publishing an event with no subscribers and `persist` being false by default).

## 6. Error Reporting and Notification

### 6.1 `EventualityOptions.handleError` Callback

- **Signature:** `(error: Error, event?: BaseEvent<any>, handler?: EventHandler<any>) => void;` (as per FR1.2.4, C8).
- **Purpose:** This is the primary mechanism for users to implement custom error reporting and notification.
- **Invocation:**
  - MUST be called when an error is caught from an event handler's execution.
  - MAY be called for other types of errors if deemed appropriate and non-disruptive.
- **Behavior:**
  - Eventuality calls this function, passing the error object and relevant context (the event being processed and the handler that failed).
  - Users can use this to:
    - Send errors to an external error tracking service (e.g., Sentry, Bugsnag).
    - Display UI notifications.
    - Implement custom retry logic (though Eventuality itself doesn't retry).

### 6.2 Default Behavior (If `handleError` is Not Provided)

- If `EventualityOptions.handleError` is not provided by the user:
  - Errors (especially from handlers) MUST still be caught by Eventuality.
  - The error MUST be logged using `EventualityLogger` (if `debugMode` is enabled).
  - The system SHOULD continue processing other handlers for the current event and subsequent events in the queue. The failure of one handler should not halt the bus.

## 7. Error Recovery and System Resilience

### 7.1 Handler Errors

- **Isolation:** As stated (FR1.6.6, C8), errors in one handler must not prevent other registered handlers for the same event from executing, nor should they stop the processing of other events in the queue.
- **No Automatic Retries:** Eventuality itself will not automatically retry a failed handler. Retry logic is complex and application-specific; it can be implemented within the handler itself or via the `handleError` callback.

### 7.2 Internal System Errors

- For critical internal errors that might compromise the integrity of the Eventuality instance (e.g., corruption of the subscription registry or persisted event store - highly unlikely with current in-memory design but a consideration for future external stores):
  - Log the error extensively.
  - The system should attempt to remain in a defined state. Depending on severity, this might mean it stops processing new events to prevent further issues. However, for most anticipated internal errors (e.g., an unexpected issue during a lookup), logging and continuing might be acceptable.

### 7.3 State Consistency

- After an error, internal data structures (subscription registry, persisted events store, event queue) should remain in a consistent state. Operations should be designed to be as atomic as possible or to handle partial failures gracefully.

## 8. Specific Error Scenarios and Handling

1. **Initialization (`Eventuality.getInstance(options)`):**
    - **Error:** Invalid `options` (e.g., `waitTimeout` is negative).
    - **Handling:** Throw `EventualityError`. Log if `debugMode` was intended to be set.

2. **`publish(event, clusters, persist)`:**
    - **Error:** `event` is null/undefined or missing `eventType`.
    - **Handling:** Log warning/error (if `debugMode`). Potentially throw `EventualityError` or silently ignore. Decision: Prefer logging and ignoring to prevent one bad publish call from crashing an application.
    - **Error:** Invalid `clusters` format.
    - **Handling:** Log warning/error. Treat as no specific clusters targeted or default to `'*'`.

3. **`subscribe(eventType, handler, cluster)`:**
    - **Error:** `handler` is not a function or valid `EventHandler` object.
    - **Handling:** Throw `TypeError` or `EventualityError`. Log.
    - **Error:** Error during delivery of persisted events to the new subscriber.
    - **Handling:** The error should be caught per persisted event delivery, passed to `handleError` (if provided) or logged, and should not prevent the subscription itself from completing or other persisted events from being delivered.

4. **`unsubscribe(eventType, handler)`:**
    - **Error:** Attempting to unsubscribe a handler not found for the `eventType`.
    - **Handling:** Silently ignore or log a warning (if `debugMode`). No error should be thrown to the caller.

5. **`request(requestDetails, clusters)`:**
    - **Error:** Invalid `requestDetails` (e.g., missing `targetEvent` or `handler`).
    - **Handling:** Throw `EventualityError`. Log.
    - **Error:** Failure during the automatic subscription of the response handler.
    - **Handling:** Propagate as an `EventualityError` from the `request` call. Log.
    - **Note:** Timeouts for responses are not explicitly handled by Eventuality unless `waitTimeout` is specifically designed for this in conjunction with the `request` pattern. If so, a timeout would be an error condition to be reported.

6. **Handler Execution (`handler(event)`):**
    - **Error:** Any error thrown from user code.
    - **Handling:** Catch the error. Call `EventualityOptions.handleError` with the error, event, and handler. If `handleError` is not provided, log the error (if `debugMode`). Continue processing other handlers and events.

## 9. Best Practices for Eventuality Users

- **Implement Idempotent Handlers:** Where possible, design handlers to be idempotent, especially if considering retries.
- **Defensive Programming in Handlers:** Handlers should include their own `try...catch` blocks for errors they can anticipate and handle locally.
- **Provide `EventualityOptions.handleError`:** Implement a global `handleError` callback for centralized reporting, logging to external services, or application-specific recovery logic.
- **Utilize `debugMode`:** Enable `debugMode` during development and troubleshooting for detailed logs from `EventualityLogger`.
- **Proper Unsubscription:** Ensure handlers are unsubscribed when no longer needed to prevent memory leaks and unintended behavior.

## 10. Summary

Eventuality's error handling strategy prioritizes system stability and developer insight. Key elements include:

- **Isolation of handler failures** through `try...catch` wrappers.
- **Centralized user-defined error reporting** via `EventualityOptions.handleError`.
- **Detailed logging** through `EventualityLogger`, controlled by `debugMode`.
- **Use of `EventualityError`** for system-specific errors.
- **Graceful degradation** by logging and continuing in many non-critical error scenarios.

This strategy aims to make Eventuality a reliable component in event-driven architectures.

---
*This document should be reviewed and updated as the Eventuality system evolves.*
