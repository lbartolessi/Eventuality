# Eventuality - Requirements Document

## 1. Introduction

### 1.1 Purpose

This document outlines the functional and non-functional requirements for the Eventuality system. Eventuality is an event bus designed to facilitate decoupled communication between different parts of an application or between different services. It supports publishing events, subscribing to events, event persistence, clustering, and a request-response pattern.

### 1.2 Scope

The scope of Eventuality includes:

- Core event bus functionalities: publish, subscribe, unsubscribe.
- Event persistence mechanism.
- Handler registration and management.
- Event clustering for targeted delivery.
- A request-response pattern built on top of the event bus.
- Basic logging and error handling capabilities.
- Configuration options for customizing behavior.

The following are out of scope for this document unless specified:

- Specific underlying technologies for event queue or persistence store (these are abstractions).
- Advanced security mechanisms (authentication, authorization beyond basic API access).
- Complex cluster management or discovery.

### 1.3 Definitions, Acronyms, and Abbreviations

- **Event:** A significant occurrence or message containing data, identified by an `eventType`.
- **Event Bus:** The central Eventuality system that manages event routing and delivery.
- **Publisher:** An entity that creates and sends events to the Event Bus.
- **Subscriber:** An entity that registers interest in certain event types and receives them.
- **Handler:** A callback function or method provided by a Subscriber to process received events.
- **Cluster:** A logical grouping used to target events to specific sets of handlers or to scope event persistence. The special cluster `"*"` typically refers to all/any clusters.
- **eventType:** A string identifier that categorizes an event.
- **Persisted Event:** An event stored by the Event Bus for later delivery, typically to new subscribers or for recovery.
- **REQUEST_EVENT:** A special type of event used to implement the request-response pattern.

## 2. Overall Description

### 2.1 Product Perspective

Eventuality is a foundational software component (library or service) intended to be integrated into larger applications to enable event-driven architecture. It acts as an intermediary for message passing, reducing direct dependencies between components.

### 2.2 Product Features (Use Cases Summary)

Based on `Eventuality-UseCaseSpecificationReport.dot`:

- **UC-001: Initialize Eventuality:** System/Developer initializes the Eventuality bus, potentially with options.
- **UC-002: Register a Handler (Subscribe):** Subscriber registers a handler for a specific `eventType` and `cluster`.
- **UC-003: Unregister a Handler (Unsubscribe):** Subscriber removes a previously registered handler.
- **UC-004: Publish an Event:** Publisher sends an event to the bus, optionally specifying target `clusters` and persistence behavior.
- **UC-005: Subscribe to an Event Type:** (Seems to overlap with UC-002).
- **UC-006: Deliver Persisted Events on Subscription:** Upon subscription, Eventuality delivers relevant persisted events to the new handler.
- **UC-007: Request an Event (Request-Response Pattern):** Publisher initiates a request and receives a response via events.
- **UC-008: Remove Persisted Events:** Publisher can trigger the removal of persisted events (e.g., by publishing with `persist=false`).
- **UC-009: Handle Duplicate Subscription:** Eventuality manages scenarios where the same handler subscribes multiple times to the same `eventType`.

### 2.3 User Characteristics

- **Developers:** Integrating Eventuality into their applications. They will use the Eventuality API (`EventualityInterface`).
- **System Components:** Acting as Publishers or Subscribers.

### 2.4 Constraints

- The design implies a TypeScript/JavaScript environment due to type annotations like `symbol`, `Set<string>`, and interface definitions.
- Diagrams are provided in DOT, PlantUML (WSL), and Mermaid formats.

### 2.5 Assumptions and Dependencies

- **Asynchronous Operations:** Many operations, like handler execution and persisted event delivery, are asynchronous.
- **Singleton Pattern:** `EventualityClass.getInstance()` suggests a singleton instance of the bus.
- **Abstract Storage:** `PersistedEventsStore` and `EventQueue` are abstract components; their concrete implementations are not defined by the core Eventuality logic but are dependencies.
- **Handler Uniqueness:** Duplicate handler checks are likely based on handler object/function reference for a given `eventType`.

## 3. Specific Requirements

### 3.1 Functional Requirements

#### 3.1.1 Event Publishing (Ref: `Eventuality-EventPublishingDataFlow.dot`, `Eventuality-PublishEventSequence.dot`)

- **FR1.1.1:** The system MUST allow a Publisher to publish an event, specifying the `event` object, target `clusters` (a set of strings), and a `persist` flag (boolean or undefined).
- **FR1.1.2:** If no handlers are found matching the `event.eventType` and target `clusters`, the event MUST be persisted to the `PersistedEventsStore` for each cluster specified in `event.clusters`.
- **FR1.1.3:** If matching handlers are found:
  - **FR1.1.3.1:** If `persist` is `true`, the event MUST be persisted to the `PersistedEventsStore` for each cluster in `event.clusters` (store/overwrite).
  - **FR1.1.3.2:** If `persist` is `undefined` and `EventualityOptions.defaultPersist` is `true`, the event MUST be persisted as in FR1.1.3.1.
  - **FR1.1.3.3:** If `event.eventType` is `'REQUEST_EVENT'`, the event MUST be persisted as in FR1.1.3.1.
  - **FR1.1.3.4:** If `persist` is `false` and `event.eventType` is not `'REQUEST_EVENT'`, any previously persisted event matching the `event.eventType` and `event.clusters` MUST be removed from the `PersistedEventsStore`.
- **FR1.1.4:** The system MUST filter registered handlers based on `event.eventType`.
- **FR1.1.5:** The system MUST select handlers for delivery based on `clusters`:
  - If `event.clusters` includes `'*'`, all handlers for the `eventType` receive the event.
  - Otherwise, handlers whose registered `cluster` is `'*'` OR whose `cluster` is in `event.clusters` receive the event.
- **FR1.1.6:** Events destined for handlers MUST be processed via an `EventQueue` for asynchronous dispatch.
- **FR1.1.7:** The callback of each selected `Handler` MUST be invoked with the `event` object.

#### 3.1.2 Event Subscription (Ref: `Eventuality-EventSubscriptionDataFlow.dot`, `Eventuality-SubscribeEventSequence.dot`)

- **FR1.2.1:** The system MUST allow a Subscriber to subscribe a `handler` (callback) to a specific `eventType` and `cluster`.
- **FR1.2.2 (Duplicate Handling - UC-009):** If the same `handler` (identified by reference) is already subscribed to the same `eventType` but for a different `cluster`, the system MUST update the subscription to the new `cluster`, effectively replacing the old cluster association for that handler and eventType. (This implies a handler can only be associated with one cluster per eventType at a time).
- **FR1.2.3:** If it's a new handler or a new eventType for an existing handler, the system MUST register the `handler` in the `SubscriptionRegistry` for the given `eventType` and `cluster`.
- **FR1.2.4 (Deliver Persisted - UC-006):** Upon successful subscription (new or updated), the system MUST query the `PersistedEventsStore` for events matching the `eventType` and `cluster`.
- **FR1.2.5:** Any matching persisted events MUST be delivered asynchronously to the subscribed `handler`. The matching logic for persisted events should consider wildcards (`*`) in cluster names similar to FR1.1.5.

#### 3.1.3 Event Unsubscription (Ref: `UC-003`, `EventualityInterface.unsubscribe()`)

- **FR1.3.1:** The system MUST allow a Subscriber to unsubscribe a previously registered `handler` for a specific `eventType`.
- **FR1.3.2:** Upon unsubscription, the `handler` MUST be removed from the `SubscriptionRegistry` for that `eventType`.
- **FR1.3.3:** (Details Needed) The system MUST define behavior for events already in the `EventQueue` for the unsubscribing handler.
- **FR1.3.4:** (Details Needed) The system MUST define if unsubscription affects any persisted event delivery logic related to this handler.

#### 3.1.4 Request-Response Pattern (Ref: `Eventuality-RequestEventSequence.dot`, `Eventuality-EventPublishingDataFlow.dot` for `REQUEST_EVENT`)

- **FR1.4.1:** The system MUST provide a `request(requestDetails, clusters)` method. `requestDetails` includes the `targetEvent` to be processed by a remote handler, the `handler` to process the response, and the `cluster` for the response handler.
- **FR1.4.2:** When `request()` is called, Eventuality MUST internally publish a `REQUEST_EVENT`. The payload of this `REQUEST_EVENT` (`RequestEventData`) MUST contain the `targetEvent`, the response `handler`, and the response `cluster` from `requestDetails`.
- **FR1.4.3:** The published `REQUEST_EVENT` MUST always be persisted (as per FR1.1.3.3).
- **FR1.4.4:** Eventuality MUST automatically subscribe the response `handler` (from `requestDetails.handler`) to the `targetEvent.eventType` (from `requestDetails.targetEvent`) for the specified `requestDetails.cluster`. This subscription is for receiving the response.
- **FR1.4.5:** The `REQUEST_EVENT` is dispatched to handlers subscribed to `'REQUEST_EVENT'`.
- **FR1.4.6:** A handler processing the `REQUEST_EVENT` is expected to perform an action and then publish the `targetEvent` (or a new event corresponding to it) which acts as the response.
- **FR1.4.7:** This response event (the published `targetEvent`) will then be delivered to the original response `handler` due to the auto-subscription in FR1.4.4.
- **FR1.4.8:** (Details Needed) The system should define how the `waitTimeout` parameter on `Eventuality` interacts with the request-response pattern (e.g., timeout for receiving a response).

#### 3.1.5 Event Persistence (Ref: `PersistedEventsStore` component, various flows)

- **FR1.5.1:** The system MUST provide an abstraction for a `PersistedEventsStore`.
- **FR1.5.2:** Events are persisted based on conditions outlined in FR1.1.2 and FR1.1.3.
- **FR1.5.3:** Persisted events are retrieved and delivered to new subscribers as per FR1.2.4 and FR1.2.5.
- **FR1.5.4:** Persisted events can be removed as per FR1.1.3.4.
- **FR1.5.5:** (Details Needed) The system MUST define the data retention policy for persisted events (e.g., overwrite on same `eventType` and `cluster`, TTL, manual cleanup). The current diagrams suggest an overwrite behavior.

#### 3.1.6 Clustering (Ref: `Cluster` entity, various flows)

- **FR1.6.1:** Events can be published to specific `clusters` or to all clusters (using a wildcard like `'*'`).
- **FR1.6.2:** Handlers subscribe to events within a specific `cluster` or for all clusters (using a wildcard like `'*'`).
- **FR1.6.3:** Event delivery to handlers MUST respect cluster matching logic (FR1.1.5).
- **FR1.6.4:** Event persistence MAY be scoped by `cluster`.

#### 3.1.7 Logging (Ref: `EventualityLogger` component)

- **FR1.7.1:** The system MUST provide an `EventualityLogger` component.
- **FR1.7.2:** The system SHOULD log key operations such as event publishing (`publishLog`), handler subscriptions (`subscribeLog`), unsubscriptions (`unsubscribeLog`), requests (`requestLog`), and handler executions (`eventHandlerLog`).
- **FR1.7.3:** Logging behavior MAY be controlled by `EventualityOptions.debugMode`.

#### 3.1.8 Error Handling (Ref: `EventualityError` class, `EventualityOptions.handleError`)

- **FR1.8.1:** The system MUST define a custom error type `EventualityError`.
- **FR1.8.2:** The system MUST allow users to provide a custom `handleError(error, event)` callback via `EventualityOptions`.
- **FR1.8.3:** If `handleError` is provided, it MUST be invoked when an error occurs during event processing by a handler.
- **FR1.8.4:** (Details Needed) The system MUST define default error handling behavior if `handleError` is not provided (e.g., log the error and continue, stop processing for that event/handler).

#### 3.1.9 Configuration (Ref: `EventualityOptions` interface)

- **FR1.9.1:** The system MUST be configurable via `EventualityOptions`.
- **FR1.9.2:** Supported options MUST include:
  - `debugMode` (boolean, optional): To control logging verbosity.
  - `defaultPersist` (boolean, optional): Default persistence behavior if `persist` flag is undefined during publish.
  - `handleError` (function, optional): Custom error handler.
  - `waitTimeout` (number, optional): Timeout value (usage details needed, e.g., for request-response).

#### 3.1.10 Decorators (Ref: `EventMethodDecorator`)

- **FR1.10.1:** The system MAY provide an `@eventMethod` decorator.
- **FR1.10.2:** (Details Needed) The decorator's functionality (e.g., simplifying handler registration or event publishing from class methods) MUST be defined.
- **FR1.10.3:** The decorator MAY accept `EventMethodOptions`, such as `tagNameSource`.

### 3.2 Interface Requirements

#### 3.2.1 `EventualityInterface` (Ref: `Eventuality-DetailedClassDiagram.dot`)

- **IR1.1:** The system MUST expose an `EventualityInterface` with the following methods:
  - `publish(event: BaseEvent<any>, clusters?: string | string[], persist?: boolean): void`
  - `subscribe<T>(eventType: string, handler: EventHandler<T>, cluster?: string): void`
  - `unsubscribe<T>(eventType: string, handler: EventHandler<T>): void`
  - `request<D, R>(requestDetails: RequestDetails<D, R>, clusters?: string | string[]): void` (Note: `RequestDetails` structure needs to be fully defined, including how `R` - the response type - is handled).

#### 3.2.2 `BaseEvent<T>` Interface

- **IR1.2:** Events MUST conform to the `BaseEvent<T>` interface:
  - `eventType: string`
  - `data: T`
  - (Implied by `Event` class) `clusters?: Set<string>` (or similar for targeting)
  - (Implied by `EventInstance` in Mermaid) `eventId?: string`, `timestamp?: Date`, `source?: string`, `correlationId?: string` - these should be considered for persisted events.

#### 3.2.3 `EventHandler<T>` Interface

- **IR1.3:** Handler callbacks MUST conform to the `EventHandler<T>` interface:
  - `(event: BaseEvent<T>): void | Promise<void>` (Allowing async handlers)
  - `id: symbol` (For unique identification)
  - `className: string` (Originating class name, for logging/debugging)
  - `tagName?: string` (Optional tag, usage to be defined, possibly by decorator)

### 3.3 Data Requirements

#### 3.3.1 Event Data Structure (Ref: `Event` class, `BaseEvent` interface)

- **DR1.1:** The internal representation of an Event (`Event` class) MUST include:
  - `eventType: string`
  - `data: any`
  - `clusters: Set<string>`
  - (Consideration) Fields from `EventInstance` (Mermaid ERD) like `eventId`, `timestamp`, `source`, `correlationId` for robust persistence and tracing.

#### 3.3.2 Handler Registration Data Structure (Ref: `Handler` class)

- **DR1.2:** The internal representation of a Handler registration (`Handler` class) MUST include:
  - `eventType: string`
  - `cluster: string`
  - `callback: EventHandler` (The actual callback function/object)

### 3.4 Non-Functional Requirements

#### 3.4.1 Performance

- **NFR1.1 (Details Needed):** Define expected event throughput (events/second).
- **NFR1.2 (Details Needed):** Define expected latency for event delivery (from publish to handler execution).

#### 3.4.2 Scalability

- **NFR2.1 (Details Needed):** The system should be designed to scale with an increasing number of events, publishers, and subscribers. (Specific targets needed).

#### 3.4.3 Reliability

- **NFR3.1 (Details Needed):** Define guarantees for event delivery (e.g., at-least-once, at-most-once), especially for persisted events.
- **NFR3.2 (Details Needed):** The system should be resilient to handler failures, preventing one failing handler from impacting others or the bus itself (partially covered by `handleError`).

#### 3.4.4 Usability (API)

- **NFR4.1:** The `EventualityInterface` API MUST be clear, well-documented, and easy to use for developers.

#### 3.4.5 Maintainability

- **NFR5.1:** The codebase SHOULD be modular and well-structured to facilitate maintenance and future enhancements.

## 4. Appendices

### 4.1 Referenced Diagrams

- `Eventuality-CoreEntity_RelationshipDiagram.dot` / `.wsd`
- `Eventuality-DeliverPersistedEventSequence.dot` / `.wsd`
- `Eventuality-DetailedClassDiagram.dot` / `.wsd`
- `Eventuality-DetailedComponentDiagram.dot` / `.wsd`
- `Eventuality-DuplicateSubscriptionSequence.dot` / `.wsd`
- `Eventuality-ERD-Suscription.mermaid`
- `Eventuality-EventPublishingDataFlow.dot` / `.wsd`
- `Eventuality-EventSubscriptionDataFlow.dot` / `.wsd`
- `Eventuality-PublishEventSequence.dot` / `.wsd`
- `Eventuality-RemovePersistedEventSequence.dot` / `.wsd`
- `Eventuality-RequestEventSequence.dot` / `.wsd`
- `Eventuality-SubscribeEventSequence.dot` / `.wsd`
- `Eventuality-UseCaseSpecificationReport.dot` / `.wsd`

### 4.2 Unresolved Questions / Areas Needing Clarification

- Precise behavior of "Update Cluster" for duplicate subscriptions (FR1.2.2).
- Detailed unsubscription logic (FR1.3.3, FR1.3.4).
- Specific use and behavior of `waitTimeout` (FR1.4.8).
- Data retention/cleanup policies for `PersistedEventsStore` (FR1.5.5).
- Default error handling when `handleError` is not provided (FR1.8.4).
- Full functionality and usage of `@eventMethod` decorator (FR1.10.2).
- Clarification on `Event` entity attributes (consistency between diagrams).
- Interaction of `EventQueue` with persistence logic (order of operations).
- Cardinalities in all ERDs.
- Resolution of contradictions between simplified sequence diagrams and detailed flow diagrams.

---
*This document is based on the analysis of provided diagrams and may require further refinement as more context becomes available.*
