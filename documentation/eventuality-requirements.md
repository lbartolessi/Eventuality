# Eventuality Event Bus Requirements

## 1. Introduction and Objectives

* **Purpose:** Eventuality is a lightweight, in-memory event bus designed to facilitate decoupled communication between different components within a single application instance. It aims to provide a structured way to publish events, subscribe to them, and handle asynchronous request-reply patterns, ensuring reliable message delivery even when subscribers are not immediately available.
* **Key Objectives:**
  * Enable loose coupling between application components.
  * Provide a robust mechanism for event publishing and consumption.
  * Implement a reliable request-reply pattern for synchronous-like interactions.
  * Ensure event persistence for scenarios where no active subscribers are present at the time of publication.
  * Offer configurable error handling policies for event handler execution.
  * Provide detailed debug logging for development and troubleshooting.
* **Document Audience:** Developers, Testers, Stakeholders, AI.

## 2. Scope

* **In-Scope:**
  * Event publishing to specific or all clusters.
  * Event subscription for typed events on specific or all clusters.
  * Strict validation and error handling for subscription attempts (e.g., duplicate handler subscriptions, re-subscriptions to different clusters).
  * Event unsubscription.
  * Request-reply mechanism with temporary reply channels and timeouts.
  * Automatic event persistence for events published without active subscribers.
  * Delivery of persisted events upon handler subscription.
  * Configurable error handling actions for exceptions within event handlers (`continue`, `stop_event`, `disable_handler`).
  * Debug logging for key bus operations.
  * Singleton instance management.
  * Creation of typed event handlers.
* **Out-of-Scope:**
  * Cross-process or distributed event communication (Eventuality is strictly in-memory).
  * Persistent storage of events across application restarts (persistence is in-memory only).
  * Advanced message queuing features like dead-letter queues (beyond simple persistence for absent subscribers).
  * Complex routing rules beyond event type and cluster.
  * Built-in authentication or authorization mechanisms for events/handlers.
  * Support for asynchronous handler execution (all handlers are executed synchronously in the event loop).

## 3. Glossary of Terms

* **Eventuality:** The core event bus class, managing event flow, subscriptions, and handler execution.
* **TypedEvent:** A descriptor for a specific type of event, including its unique string identifier (`eventType`) and the expected payload type.
* **EventHandler:** A function or object wrapper that processes an event's payload. It includes a unique `id` (Symbol), `className`, `tagName` (if applicable), and an optional `onError` policy.
* **Payload:** The data associated with an event or request.
* **Cluster:** A logical grouping or namespace within the event bus, allowing events to be targeted at specific sets of subscribers (e.g., 'UI', 'Backend', 'UserModule'). `ALL_CLUSTERS` (`*`) signifies a global scope.
* **RequestPayload:** A specific type of payload used in request-reply patterns, including a `replyTo` `TypedEvent` descriptor and a `clusterTo` for the reply.
* **ErrorHandlingAction:** An enumeration (`'continue'`, `'stop_event'`, `'disable_handler'`) defining how the bus should react to an error thrown by an `EventHandler`.
* **LogContext:** An interface defining the structured data passed to the `EventualityLogger` for consistent logging.
* **Persistence:** The mechanism by which an event is temporarily stored if no active subscribers are found for its target clusters at the time of publication, to be delivered later when a relevant handler subscribes.

## 4. Functional Requirements (FR)

* **FR-001: Event Publishing (`publish`)**
  * **Description:** As a system component, I want to publish a typed event with a payload to specified clusters (or all clusters by default), so that interested handlers can react to it.
  * **Acceptance Criteria (AC):**
    * AC-001.1: The event and its payload must be added to an internal processing queue.
    * AC-001.2: If no active subscribers are found for any of the target clusters, the event must be persisted for those clusters.
    * AC-001.3: If debug mode is enabled, a `publish` log entry must be generated with relevant context (event type, clusters, subscriber presence, payload).
    * AC-001.4: The internal event queue processing must be triggered.
* **FR-002: Event Subscription (`subscribe`)**
  * **Description:** As a system component, I want to subscribe an event handler to a specific typed event on a specific cluster (or all clusters by default), so that it receives relevant events.
  * **Acceptance Criteria (AC):**
    * AC-002.1: The provided handler must be a valid `EventHandler` instance (created via `Eventuality.createEventHandler`).
    * AC-002.2: If the handler is already subscribed to the *same event type and same cluster*, the subscription attempt must be ignored, and a debug log entry (if enabled) indicating a duplicate must be generated.
    * AC-022.3: If the handler is already subscribed to the *same event type but a different cluster*, an error must be handled via the `handleError` mechanism, indicating that the handler must unsubscribe first. The subscription must not proceed.
    * AC-002.4: If the handler is already subscribed to a *different event type*, an error must be handled via the `handleError` mechanism, indicating that a handler instance can only be subscribed to one event type. The subscription must not proceed.
    * AC-002.5: The handler must be successfully associated with the specified event type and cluster.
    * AC-002.6: If debug mode is enabled, a `subscribe` log entry must be generated with relevant context (event type, handler details, clusters).
    * AC-002.7: Any previously persisted events for the given event type and cluster (or `ALL_CLUSTERS`) must be delivered to the newly subscribed handler and then cleared from persistence.
* **FR-003: Event Unsubscription (`unsubscribe`)**
  * **Description:** As a system component, I want to unsubscribe an event handler from a typed event, so that it no longer receives events.
  * **Acceptance Criteria (AC):**
    * AC-003.1: The provided handler must be a valid `EventHandler` instance.
    * AC-003.2: If the handler is not currently subscribed, a warning must be logged (if debug mode is enabled), and no action should be taken.
    * AC-003.3: If the handler is subscribed to a *different event type* than the one specified in the unsubscribe call, an error must be handled via the `handleError` mechanism, and the unsubscription must not proceed.
    * AC-003.4: The handler must be successfully removed from the list of subscribers for its associated event type and cluster.
    * AC-003.5: If a cluster becomes empty after unsubscription, it must be cleaned up from the internal maps.
    * AC-003.6: If debug mode is enabled, an `unsubscribe` log entry must be generated with relevant context (event type, handler details).
* **FR-004: Request/Reply Mechanism (`request`)**
  * **Description:** As a system component, I want to send a request event and asynchronously await a specific reply, so that I can implement synchronous-like interactions over the asynchronous bus.
  * **Acceptance Criteria (AC):**
    * AC-004.1: A unique, temporary reply `TypedEvent` channel must be generated for each request.
    * AC-004.2: A one-time `EventHandler` must be created and subscribed to this temporary reply channel, specifically on the `clusterTo` specified in the request payload.
    * AC-004.3: A configurable timeout mechanism must be initiated for the request. If the timeout expires before a reply is received, the request promise must be rejected with an `EventualityError`.
    * AC-004.4: Upon receiving a reply, the one-time handler must resolve the request promise and immediately unsubscribe itself to prevent memory leaks.
    * AC-004.5: The original request payload must be augmented with the `replyTo` `TypedEvent` descriptor before publishing.
    * AC-004.6: The request event must be published to the specified clusters (or all clusters by default).
    * AC-004.7: If debug mode is enabled, a `request` log entry must be generated with relevant context (request event type, clusters, payload).
* **FR-005: Event Persistence and Delivery**
  * **Description:** As a system component, I want events to be persisted if no active subscribers are present for their target clusters at the time of publication, and then delivered when a relevant handler subscribes.
  * **Acceptance Criteria (AC):**
    * AC-005.1: Events are persisted per `eventType` and `cluster` if `hasAnySubscription` returns `false` for the target clusters.
    * AC-005.2: When a handler subscribes, `deliverAndClearPersistedEvent` must be called to check for and deliver any relevant persisted events.
    * AC-005.3: Persisted events must be delivered to the newly subscribed handler, regardless of whether they were persisted for the specific cluster or for `ALL_CLUSTERS` (unless the subscription itself is for `ALL_CLUSTERS` to avoid duplicates).
    * AC-005.4: Once delivered, persisted events must be removed from the persistence store.
* **FR-006: Error Handling within Handlers (`handleError`, `onError`)**
  * **Description:** As a developer, I want to define how the event bus reacts to errors thrown by event handlers, allowing for flexible error recovery strategies.
  * **Acceptance Criteria (AC):**
    * AC-006.1: The `Eventuality` instance must be initialized with a global `handleError` callback in its options.
    * AC-006.2: Individual `EventHandler` instances can optionally define an `onError` property to override the global policy for that specific handler.
    * AC-006.3: If an `EventHandler` throws an error, the configured `handleError` callback (or `onError` property) must determine the `ErrorHandlingAction`. The global `handleError` callback's return value takes precedence. If the global `handleError` returns `undefined` (indicating no explicit global policy for the specific error), then the individual `EventHandler`'s `onError` property will be used.
    * AC-006.4: If the action is `'stop_event'`, no further handlers for the current event must be executed. A debug log entry must be generated.
    * AC-006.5: If the action is `'disable_handler'`, the faulty handler must be automatically unsubscribed from the bus. A debug log entry must be generated.
    * AC-006.6: If the action is `'continue'` (default), the bus must proceed to execute the next handler for the current event.
* **FR-007: Debug Logging (`debugMode`)**
  * **Description:** As a developer, I want to enable or disable detailed logging of internal bus operations to aid in debugging and understanding event flow.
  * **Acceptance Criteria (AC):**
    * AC-007.1: Logging must be controlled by the `debugMode` option provided during `Eventuality` instance creation.
    * AC-007.2: When `debugMode` is `true`, log entries must be generated for `publish`, `subscribe`, `unsubscribe`, `request`, and `handler_execution` (both success and error).
    * AC-007.3: Log entries must be structured using `LogContext` and processed by `EventualityLogger`.

## 5. Non-Functional Requirements (NFR)

* **NFR-001: Performance - Event Delivery Latency**
  * **Description:** Events should be delivered to subscribed handlers with minimal latency within the same application process.
  * **Metric:** Not Available (Requires benchmarking, but implied by synchronous handler execution).
* **NFR-002: Reliability - Event Delivery**
  * **Description:** Events must not be lost due to temporary absence of subscribers, thanks to the persistence mechanism.
  * **Metric:** 100% event delivery guarantee for persisted events.
* **NFR-003: Maintainability - Code Structure**
  * **Description:** The codebase must be well-structured, readable, and easy to understand for new developers.
  * **Metric:** Adherence to established code style, clear separation of concerns (e.g., logger, interfaces), logical grouping and ordering of methods (static, public, private, call order).
* **NFR-004: Extensibility - Event and Handler Types**
  * **Description:** It must be straightforward to define new event types and create new event handlers without modifying the core bus logic.
  * **Metric:** Use of TypeScript generics (`TypedEvent<PayloadType>`, `EventHandler<PayloadType>`) and `createTypedEvent`/`createEventHandler` factory functions.
* **NFR-005: Testability - Instance Management**
  * **Description:** The `Eventuality` instance must be easily manageable for unit testing purposes, allowing for isolation and state reset.
  * **Metric:** Provision of `getInstance` (singleton) and `createInstance` (new instance) methods, and a `_resetInstance` method for testing.

## 6. Use Cases

* **UC-001: Publish a New User Registered Event**
  * **Actor(s):** User Registration Service.
  * **Preconditions:** A new user has successfully registered in the system.
  * **Main Flow (Steps):**
        1. User Registration Service calls `eventuality.publish(userRegisteredEvent, userData)`.
        2. Eventuality queues the event.
        3. Eventuality checks for subscribers.
        4. If subscribers exist, Eventuality delivers the event.
        5. If no subscribers, Eventuality persists the event.
  * **Postconditions:** The `userRegisteredEvent` is queued for delivery or persisted, and relevant handlers are notified.
* **UC-002: Subscribe a Welcome Email Handler**
  * **Actor(s):** Welcome Email Service.
  * **Preconditions:** The Welcome Email Service is initialized.
  * **Main Flow (Steps):**
        1. Welcome Email Service creates an `EventHandler` for `userRegisteredEvent`.
        2. Welcome Email Service calls `eventuality.subscribe(userRegisteredEvent, welcomeEmailHandler)`.
        3. Eventuality registers the handler.
        4. Eventuality checks for and delivers any previously persisted `userRegisteredEvent`s to `welcomeEmailHandler`.
  * **Postconditions:** `welcomeEmailHandler` is ready to receive `userRegisteredEvent`s, and any pending events are processed.
* **UC-003: Request User Profile Data**
  * **Actor(s):** UI Component.
  * **Preconditions:** UI Component needs to display user profile data.
  * **Main Flow (Steps):**
        1. UI Component calls `eventuality.request(getUserProfileRequestEvent, { userId: '123', clusterTo: 'Backend' })`.
        2. Eventuality creates a temporary reply channel and subscribes a one-time handler.
        3. Eventuality publishes `getUserProfileRequestEvent` to the 'Backend' cluster.
        4. A backend service handler processes the request and publishes a reply event to the temporary channel.
        5. Eventuality's one-time handler receives the reply, resolves the promise, and unsubscribes.
  * **Alternative Flows/Exceptions:**
    * **AF-1 (Timeout):** If no reply is received within the configured timeout, the request promise is rejected.
  * **Postconditions:** UI Component receives user profile data or an error indicating timeout.

## 7. UI/UX Design

* Not Applicable (Eventuality is a backend/logic component without direct UI).

## 8. Data Model

* **TypedEvent:** `{ eventType: string, payloadType: T }` - Defines the type and structure of an event.
* **EventHandler:** `{ id: Symbol, className: string, tagName: string | null, onError?: ErrorHandlingAction }` - Represents a callable function with metadata for tracking and error handling.
* **RequestPayload:** `{ replyTo: TypedEvent<TResPayload>, clusterTo: string, ... }` - Extends a standard payload to include reply channel information for request-reply patterns.
* **LogContext:** `{ action: 'publish' | 'subscribe' | 'unsubscribe' | 'request' | 'handler_execution' | 'info' | 'error', eventType?: string, clusters?: Set<string>, hasSubscribers?: boolean, payload?: any, handler?: { id: string, className: string, tagName: string | null }, error?: Error, status?: 'success' | 'error', message?: string }` - Standardized structure for logging event bus operations.
* **Internal Maps:**
  * `handlerMap`: `Map<eventType: string, Map<clusterKey: string, EventHandler[]>>` - Stores handlers organized by event type and cluster.
  * `persistedEvents`: `Map<eventType: string, Map<clusterKey: string, { payload: any }>>` - Stores events that were published without active subscribers.
  * `handlerIdToSubscriptionDetails`: `Map<handlerId: Symbol, { eventDescriptor: TypedEvent<any>, cluster: string }>` - Inverse map for quick lookup of a handler's current subscription.

## 9. Technology Stack

* **Language:** TypeScript
* **Runtime:** Node.js (implied by `setTimeout`, `console.log`, `Symbol`)
* **Testing Framework:** Not Available (To be determined, but likely Jest/Vitest based on common TypeScript practices).

## 10. Additional Considerations / Open Questions

* **Singleton Pattern:** The `Eventuality` class implements a singleton pattern (`getInstance`), but also provides `createInstance` for scenarios requiring multiple independent bus instances (e.g., testing, specific architectural needs).
* **Synchronous Handler Execution:** All event handlers are executed synchronously within the `processQueue` loop. This simplifies error handling and order guarantees but could block the event loop if handlers perform long-running operations.
* **Error Handling Granularity:** The `handleError` callback provides a powerful mechanism for centralized error policy, complemented by handler-specific `onError` overrides.
* **Future Enhancements:**
  * Asynchronous handler execution (e.g., using `Promise.all` or a dedicated worker pool).
  * More sophisticated persistence mechanisms (e.g., to disk, external database).
  * Batch processing of events.
  * Support for event prioritization.
