# Eventuality - Software Design Document

## 1. Introduction

### 1.1 Purpose

This Software Design Document (SDD) provides a comprehensive architectural overview and detailed design specifications for the Eventuality system. Eventuality is an event bus designed to facilitate decoupled communication within applications, particularly for web components, supporting publish-subscribe patterns, asynchronous processing, event persistence, clustering, and a request-response mechanism.

This document is intended to be the central reference for understanding the system's design, guiding its implementation, maintenance, and future evolution. It consolidates information from various source documents, including requirements, architectural descriptions, and technical decisions.

### 1.2 Scope

The scope of this document encompasses the software architecture and detailed design of the Eventuality system, as implemented primarily in `src/Eventuality.ts` and its associated modules (e.g., `src/decorators.ts`). It covers:

- Core event bus functionalities: publishing, subscribing, and unsubscribing.
- Event persistence mechanisms.
- Handler registration and management, including duplicate handling.
- Event clustering for targeted delivery.
- The request-response pattern.
- Asynchronous event processing.
- Configuration options.
- Error handling and logging strategies.

The following are considered out of scope for this design document unless explicitly stated:

- Specific underlying technologies for future, pluggable event queue or persistence store implementations (currently in-memory).
- Advanced security mechanisms beyond basic API access.
- Complex external cluster management or discovery services.
- Detailed UI design or specific application use cases beyond illustrating Eventuality's functionality.

### 1.3 Definitions, Acronyms, and Abbreviations

Refer to Section 1.3 of the Eventuality - Requirements Document for a comprehensive list of definitions, acronyms, and abbreviations used within the context of the Eventuality system. Key terms include:

- **Event:** A `BaseEvent<D>` object with `eventType` and `data`.
- **Handler:** An `EventHandler<D>` function that processes events.
- **Cluster:** A logical identifier for grouping event delivery.
- **Persisted Event:** An event stored for new subscribers.
- **`REQUEST_EVENT`:** A special event type for request-response patterns.
- **Singleton:** A design pattern ensuring a single instance.

### 1.4 References

This document builds upon and refers to several other key documents and diagrams within the Eventuality project:

**Core Documents:**

- Eventuality - Requirements Document (Overall system requirements)
- Eventuality - RequirementsDocument.md (Original requirements, some parts in Spanish)
- Eventuality - SoftwareArchitectureDocument.md (Foundation for this SDD)
- Eventuality - FinalTechnicalDecisions.md (Consolidated technical decisions)
- Eventuality - Detailed Error Handling Strategy
- Eventuality - Implementation Plan (For context on build phases)

**Diagrams and Flow Descriptions (Verbal & Source):**
- Entity-Relationship Diagrams:
  - Eventuality-CoreEntity_RelationshipDiagram.md & .dot & .wsd
  - Eventuality-ERD-Suscription.md & .mermaid
- Class and Component Diagrams:
  - Eventuality-DetailedClassDiagram.md & .dot & .wsd
  - Eventuality-DetailedComponentDiagram.md & .dot & .wsd
- Sequence Diagrams:
  - Eventuality-DeliverPersistedEventSequence.md & .dot & .wsd
  - Eventuality-DuplicateSubscriptionSequence.md & .dot & .wsd
  - Eventuality-PublishEventSequence.md & .dot & .wsd
  - Eventuality-RemovePersistedEventSequence.md & .dot & .wsd
  - Eventuality-RequestEventSequence.md & .dot & .wsd
  - Eventuality-SubscribeEventSequence.md & .dot & .wsd
- Data Flow Diagrams:
  - Eventuality-EventPublishingDataFlow.md & .dot & .wsd
  - Eventuality-EventSubscriptionDataFlow.md & .dot & .wsd
- Use Case Diagrams:
  - Eventuality-UseCaseSpecificationReport.md & .dot & .wsd
- Diagramming Standards:
  - diagrams.md

**Source Code:**

- `src/Eventuality.ts` (Core implementation)
- `src/decorators.ts` (Handler decorators)

## 2. System Overview

### 2.1 Goals and Objectives

Eventuality aims to provide a:

- **Decoupled Communication Channel:** Allowing different parts of an application (especially Web Components) to communicate without direct dependencies.
- **Type-Safe Event System:** Leveraging TypeScript for robust event and handler definitions.
- **Flexible Event Delivery:** Supporting targeted delivery via clusters and ensuring late subscribers can receive relevant past events through persistence.
- **Asynchronous and Non-Blocking Operation:** Ensuring the event bus does not hinder application responsiveness.
- **Developer-Friendly API:** Offering a clear, concise, and well-documented interface.
- **Observable System:** Providing debug logging for traceability.

### 2.2 System Context

Eventuality is designed as a client-side JavaScript/TypeScript library. It operates as a singleton within the application's runtime environment (e.g., a browser window). Publishers and Subscribers are typically other components or services within the same application.

*(For a visual representation of actors and high-level interactions, refer to the Use Case diagrams, e.g., Eventuality-UseCaseSpecificationReport.wsd).*

### 2.3 High-Level Architecture

Eventuality follows a centralized event bus architecture. Key architectural characteristics include:

- **Singleton Instance:** A single `Eventuality` instance manages all event bus operations.
- **Internal Queuing:** Events are processed asynchronously via an internal FIFO queue.
- **Registries:** Dedicated in-memory registries manage active subscriptions and persisted events.
- **Facade Pattern:** The `Eventuality` class acts as a facade, simplifying interaction with its internal subsystems.

*(Refer to the Eventuality-DetailedComponentDiagram.wsd for a component-based view of the architecture.)*

## 3. Architectural Design

This section details the architecture of Eventuality using multiple views, largely based on the Eventuality-SoftwareArchitectureDocument.md.

### 3.1 Architectural Goals and Constraints

The architecture is designed to meet the Non-Functional Requirements (NFRs) and Constraints (Cs) specified in the Eventuality - Requirements Document. Key drivers include:

- **Singleton Pattern (C1, FR1.1):** Ensures a single, global event bus instance.
- **Type Safety (C2, NFR3.3):** Leverages TypeScript for event/handler definitions.
- **Asynchronous Processing (C3, FR1.5, NFR1.6):** Non-blocking, queued event processing. Configurable `handlerAsyncMode` (`individual` or `batch`).
- **Cluster-based Scoping (C4, FR1.3.3, FR1.4.4):** Logical grouping for event routing.
- **Event Persistence (C5, FR1.7):** In-memory storage for late subscriber delivery.
- **API Adherence (C6, IR1.1):** Strict implementation of `EventualityInterface`.
- **Dynamic Debugging (C7, FR1.2.2, FR1.8):** Toggleable debug mode with `EventualityLogger`.
- **Robust Error Handling (C8, FR1.7, NFR2.3):** Isolated handler errors, configurable `handleError` callback.
- **Minimal Dependencies (C9):** Lean implementation.
- **Testability (NFR5.1, NFR5.2):** High test coverage, `_resetInstance()` for test isolation.
- **Maintainability (NFR4.1, NFR4.2):** Clean, well-commented codebase.
- **Performance (NFR1.1-NFR1.5):** Low latency, minimal memory usage.

*(Refer to Eventuality-FinalTechnicalDecisions.md for rationale on specific choices.)*

### 3.2 Logical View

This view describes the system's static structure, key abstractions, and their relationships.

#### 3.2.1 Key Abstractions and Components

- **`Eventuality` (Core Facade / Singleton):** The central class implementing `EventualityInterface`, orchestrating internal components, managing configuration, and providing the public API.
- **`EventualityInterface` (API Contract):** Defines the public methods (`publish`, `subscribe`, `unsubscribe`, `request`).
- **Event Definitions (`BaseEvent<D>`, `RequestEventData<D>`, `RequestEvent<D>`):** Interfaces for event structures.
- **`EventHandler<D>` (Handler Contract):** Interface for event handler functions, including mandatory `id: symbol`.
- **`EventualityOptions` (Configuration):** Interface for initialization options (`debugMode`, `defaultPersist`, `handleError`, `waitTimeout`, `handlerAsyncMode`).
- **`EventualityLogger` (Logging Utility):** Static methods for debug logging.
- **`EventualityError` (Custom Error):** Custom error class for Eventuality-specific issues.
- **`@eventMethod` (Decorator):** Transforms class methods into `EventHandler<D>` instances.

*(Refer to Eventuality-DetailedClassDiagram.wsd for detailed class structures and relationships.)*

#### 3.2.2 Conceptual Internal Managers

The `Eventuality` class conceptually encapsulates several management responsibilities:

- **Subscription Manager:** Manages handler registration, lookup, and removal.
- **Persistence Manager:** Stores, retrieves, and removes persisted events.
- **Event Queue Manager:** Manages the FIFO queue for events awaiting processing.
- **Event Processor:** Dequeues events, applies rules, finds subscribers, and invokes handlers.
- **Configuration Manager:** Manages system settings.

#### 3.2.3 Package Structure (Conceptual)

- `eventuality.interfaces`: Core interfaces.
- `eventuality.core`: Main `Eventuality` class.
- `eventuality.errors`: `EventualityError`.
- `eventuality.logging`: `EventualityLogger`.
- `eventuality.decorators`: `@eventMethod` decorator.

### 3.3 Process View

This view describes runtime behavior, concurrency, and control flow.

#### 3.3.1 Asynchronous Event Processing Loop

- Events are added to an internal FIFO queue.
- A processing flag (`this.processing`) ensures sequential processing of the queue.
- A configurable `this.waitTimeout` introduces a delay between processing distinct events from the queue to yield to the main thread.
- Handlers for a single event are invoked asynchronously based on `EventualityOptions.handlerAsyncMode`:
  - `"individual"` (default): Each handler is invoked in its own microtask (e.g., `Promise.resolve().then(() => handler(event))`). This provides better error isolation.
  - `"batch"`: All handlers for an event are invoked sequentially within the same task that processes the event from the main queue. This might have slightly less overhead for many small, synchronous handlers but offers less error isolation between handlers of the same event.

*(Refer to Eventuality-EventPublishingDataFlow.md for the publishing flow.)*

#### 3.3.2 Control Flow Summary

- **`publish`:**
    1. Validate event (minimal).
    2. Determine target clusters.
    3. Log publish attempt (if `debugMode`).
    4. Add event to `this.eventQueue`.
    5. Trigger `this._processEventQueue()` if not already processing.
- **`_processEventQueue` (Loop):**
    1. If `this.processing` or queue empty, return.
    2. Set `this.processing = true`.
    3. Dequeue `eventToProcess`.
    4. `await new Promise(resolve => setTimeout(resolve, this.waitTimeout))`.
    5. Find matching `handlersToNotify` from `this.subscriptionRegistry` based on `eventToProcess.eventType` and `eventToProcess.clusters` (respecting wildcard logic).
    6. Determine if event should be persisted (`shouldPersist`) based on `eventToProcess.persist` flag, `this.options.defaultPersist`, or if it's a `REQUEST_EVENT`.
    7. If `!handlersToNotify.length && !shouldPersist` (and not `REQUEST_EVENT`), log warning and potentially force persist (as per FR1.7.6).
    8. If `shouldPersist`:
        - Persist `eventToProcess` in `this.persistedEventsStore`.
        - If `REQUEST_EVENT`, perform auto-subscription for response (FR1.9.2, FR1.9.4).
    9. Else (if `!shouldPersist` and not `REQUEST_EVENT`):
        - Remove from `this.persistedEventsStore` (FR1.1.3.4).
    10. For each `handler` in `handlersToNotify`:
        - Invoke `handler.callback(eventToProcess)` according to `handlerAsyncMode`.
        - Wrap invocation in `try...catch`.
        - If error, call `this.options.handleError` or log (FR1.8.3, FR1.8.4).
        - Log handler execution (if `debugMode`).
    11. Set `this.processing = false`.
    12. Recursively call `this._processEventQueue()` to continue with the next item.
- **`subscribe`:**
    1. Validate parameters.
    2. Register/update handler in `this.subscriptionRegistry` (handling duplicates by updating cluster - FR1.2.2).
    3. Log subscription (if `debugMode`).
    4. Asynchronously find and deliver matching persisted events from `this.persistedEventsStore` (FR1.2.4, FR1.2.5).
- **`unsubscribe`:**
    1. Remove handler from `this.subscriptionRegistry`.
    2. Log unsubscription (if `debugMode`).
- **`request`:**
    1. Validate `requestDetails`.
    2. Auto-subscribe `requestDetails.handler` to `requestDetails.targetEvent.eventType` on `requestDetails.cluster` (FR1.4.4).
    3. Construct `REQUEST_EVENT` with `requestDetails` in payload.
    4. Call `this.publish(requestEvent, clustersToPublishRequestEvent, true)` (forcing persistence - FR1.4.3).

*(Refer to data flow diagrams like Eventuality-EventPublishingDataFlow.wsd and Eventuality-EventSubscriptionDataFlow.wsd.)*

### 3.4 Data View

Describes significant data structures.

- **`eventQueue: BaseEvent<any>[]`:** In-memory FIFO array storing events awaiting processing.
- **`subscriptionRegistry: Map<string, Map<string, Map<symbol, EventHandler<any>>>>`:**
  - Outer Map: `eventType` (string) -> Inner Map
  - Middle Map: `cluster` (string, `"*"` for wildcard) -> Innermost Map
  - Innermost Map: `handler.id` (symbol) -> `EventHandler<any>` instance.
  - Ensures a handler (by `id`) is registered only once per `eventType` but its `cluster` can be updated.
- **`persistedEventsStore: Map<string, Map<string, BaseEvent<any>>>`:**
  - Outer Map: `eventType` (string) -> Inner Map
  - Inner Map: `cluster` (string, `"*"` for wildcard) -> `BaseEvent<any>` (latest persisted event for this combination).
  - Overwrites previous event on new persistence for the same `eventType` and `cluster`.
- **`options: EventualityOptions`:** Frozen configuration object.

*(Refer to Eventuality-CoreEntity_RelationshipDiagram.wsd and Eventuality-ERD-Suscription.mermaid for entity relationships.)*

### 3.5 Deployment View

- Eventuality is a **software library** deployed **in-process** within a host JavaScript/TypeScript application (e.g., browser, Node.js).
- It has no external runtime dependencies beyond standard JavaScript features.

## 4. Detailed Design

### 4.1 Core Class: `Eventuality`

This class is the heart of the system.

#### 4.1.1 Constructor and Singleton Initialization (`getInstance`)

- Private constructor to enforce singleton pattern.
- Static `Eventuality.instance: EventualityInterface | null`.
- Static `Eventuality.getInstance(options?: EventualityOptions): EventualityInterface`:
  - If `Eventuality.instance` exists:
    - Logs warning if new `options` are provided (FR1.1.1).
    - Updates `debugMode` and `waitTimeout` if provided in new `options`.
    - Returns existing instance.
  - Else (first call):
    - Creates new `Eventuality` instance with provided or default options.
    - Stores and returns the new instance.
- Static `Eventuality._resetInstance()`: Clears `Eventuality.instance` and resets all internal state of the current instance for testing (NFR1.5.1).

#### 4.1.2 Public API Methods (Implementing `EventualityInterface`)

- **`publish(event: BaseEvent<any>, clusters?: string | string[] | Set<string>, persist?: boolean): void`**
  - Normalizes `clusters` to a `Set<string>`.
  - Assigns normalized `clusters` and `persist` (or default) to the event object itself for later processing in the queue.
  - Adds the event to `this.eventQueue`.
  - Calls `this._processEventQueue()` to initiate processing if not already running.
  - Logs details if `debugMode` is enabled.

- **`subscribe<T>(eventType: string, handler: EventHandler<T>, cluster: string = '*'): void`**
  - Validates `eventType` and `handler` (especially `handler.id`).
  - Retrieves or creates the map for `eventType`.
  - Retrieves or creates the map for `cluster`.
  - Checks if `handler.id` is already registered for this `eventType` across *any* cluster.
    - If yes, and it's for a different cluster, remove old entry and add to new `cluster` map (effectively updating cluster - FR1.2.2).
    - If yes, and for the same cluster, log warning and do nothing.
    - If no, add `handler` to `this.subscriptionRegistry[eventType][cluster]`.
  - Logs details if `debugMode` is enabled.
  - Asynchronously calls `this._deliverPersistedEvents(eventType, cluster, handler)`.

- **`unsubscribe<T>(eventType: string, handler: EventHandler<T>): void`**
  - Iterates through clusters for the given `eventType` in `this.subscriptionRegistry`.
  - Removes the `handler` (identified by `handler.id`) if found.
  - Cleans up empty cluster/eventType maps.
  - Logs details if `debugMode` is enabled.

- **`request<T extends BaseEvent<D>, D>(requestDetails: { targetEvent: T; handler: EventHandler<D>; cluster: string; }, clustersToPublishRequestEvent: string | string[] | Set<string>): void`** (Signature as per FR1.4.1)
  - Validates `requestDetails`.
  - Calls `this.subscribe(requestDetails.targetEvent.eventType, requestDetails.handler, requestDetails.cluster)` to set up the response listener (FR1.4.4).
  - Creates a `REQUEST_EVENT`:

        ```typescript
        const requestEvent: BaseEvent<RequestEventData<D>> = {
            eventType: 'REQUEST_EVENT',
            data: {
                targetEvent: requestDetails.targetEvent,
                handler: requestDetails.handler, // The response handler
                cluster: requestDetails.cluster,   // The cluster for the response
            },
            // clusters will be set by publish
        };
        ```

  - Calls `this.publish(requestEvent, clustersToPublishRequestEvent, true)` (FR1.4.2, FR1.4.3 - `persist` is true).
  - Logs details if `debugMode` is enabled.

#### 4.1.3 Internal Helper Methods

- **`_processEventQueue(): void`** (Described in Process View 3.3.2)
- **`_deliverPersistedEvents<T>(eventType: string, cluster: string, handler: EventHandler<T>): void`**
  - Asynchronously queries `this.persistedEventsStore`.
  - Filters events based on `eventType` and `cluster` matching logic (including wildcards as per FR1.2.5 and section 3.3.3 of `Eventuality-RequirementsDocument.md`).
  - For each matching persisted event:
    - Invokes `handler.callback(persistedEvent)` wrapped in `try...catch`.
    - Handles errors via `this.options.handleError` or logs.
    - Logs delivery if `debugMode`.
- **`_findHandlersToNotify(event: BaseEvent<any>): EventHandler<any>[]`**
  - Implements handler matching logic based on `event.eventType` and `event.clusters` against `this.subscriptionRegistry`, including wildcard (`'*'`) rules (FR1.1.5).
- **`_shouldPersistEvent(event: BaseEvent<any>, hasMatchingHandlers: boolean): boolean`**
  - Implements persistence decision logic:
    - If `event.persist` is explicitly `true`, return `true`.
    - If `event.persist` is explicitly `false`, return `false`.
    - If `event.persist` is `undefined`, use `this.options.defaultPersist`.
    - If `event.eventType === 'REQUEST_EVENT'`, return `true` (FR1.1.3.3).
    - If `!hasMatchingHandlers` and not `REQUEST_EVENT`, log warning and return `true` (FR1.1.2, effectively forced persistence).
- **`_persistEvent(event: BaseEvent<any>): void`**
  - For each cluster in `event.clusters` (or `"*"` if `event.clusters` is empty/wildcard for persistence):
    - Stores/overwrites `event` in `this.persistedEventsStore[event.eventType][cluster]`.
  - Logs persistence if `debugMode`.
- **`_removePersistedEvent(event: BaseEvent<any>): void`**
  - For each cluster in `event.clusters`:
    - Removes event from `this.persistedEventsStore[event.eventType][cluster]`.
  - Logs removal if `debugMode`.

#### 4.1.4 Properties

- `private readonly options: Readonly<EventualityOptions>`
- `public debugMode: boolean` (dynamically configurable)
- `public waitTimeout: number` (dynamically configurable)
- `private eventQueue: BaseEvent<any>[] = []`
- `private subscriptionRegistry: Map<string, Map<string, Map<symbol, EventHandler<any>>>> = new Map()`
- `private persistedEventsStore: Map<string, Map<string, BaseEvent<any>>> = new Map()`
- `private processing: boolean = false`

### 4.2 Data Structures (Detailed)

#### 4.2.1 `SubscriptionRegistry`

- Structure: `Map<eventType: string, Map<cluster: string, Map<handlerId: symbol, EventHandler<any>>>>`
- **Handler Uniqueness:** An `EventHandler` (identified by its `id: symbol`) can only be registered for a single `eventType`. Attempting to subscribe the same `EventHandler` instance to a different `eventType` should result in an error (as per `Eventuality-RequirementsDocument.md` Section 3.3.3 - Handler Identity).
- **Cluster Update:** If `subscribe` is called for an existing `handlerId` and `eventType` but with a new `cluster`, the old cluster registration is removed, and the handler is registered under the new cluster. This means a handler is active on only one cluster per eventType at a time.

#### 4.2.2 `PersistedEventsStore`

- Structure: `Map<eventType: string, Map<cluster: string, BaseEvent<any>>>`
- Stores the *latest* event for each `(eventType, cluster)` pair. Publishing a new event with `persist=true` for an existing pair overwrites the old one.
- Wildcard (`'*'`) cluster persistence:
  - If an event is published with `clusters = ['*']` and `persist=true`, it's stored under `persistedEventsStore[eventType]['*']`.
  - This "wildcard persisted event" is delivered to subscribers of that `eventType` on *any* specific cluster, and to subscribers of `eventType` on the `'*'` cluster (FR1.2.5).

#### 4.2.3 Wildcard (`'*'`) Cluster Logic

- **Publishing to `'*'`:** If `event.clusters` includes `'*'`, all handlers for that `eventType` (regardless of their registered cluster) receive the event (FR1.1.5).
- **Subscribing to `'*'`:** A handler subscribed to `cluster = '*'` receives events of that `eventType` published to *any* specific cluster or to the `'*'` cluster (FR1.1.5).
- **Persisted Event Delivery with Wildcards:**
  - Subscriber to specific `clusterX`: Receives persisted events for `(eventType, clusterX)` AND `(eventType, '*')`.
  - Subscriber to `cluster = '*'`: Receives all persisted events for `eventType` across all clusters, including those persisted under `(eventType, '*')`.

### 4.3 Error Handling Strategy

Refer to the Eventuality - Detailed Error Handling Strategy document. Key points:

- Handler errors are caught and isolated.
- `EventualityOptions.handleError(error, event, handler)` is called.
- If `handleError` is not provided, errors are logged (if `debugMode`).
- `EventualityError` is used for system-specific errors.

### 4.4 Logging Strategy

- `EventualityLogger` provides static methods for conditional logging based on `debugMode`.
- Logs cover: publish, subscribe, unsubscribe, request, handler execution, persisted event delivery, errors, warnings.
- Log messages are designed to be informative and include contextual data.

### 4.5 Decorators (`@eventMethod`)

- Defined in `src/decorators.ts`.
- Simplifies creating `EventHandler` objects from class methods.
- Automatically populates `id: Symbol()`, `className`, and `tagName` (from method name or `EventMethodOptions`).
- Eventuality itself consumes `EventHandler` objects; it's agnostic to how they were created.

## 5. Design Decisions Rationale

This section summarizes key design decisions and their rationale, drawing from Eventuality-FinalTechnicalDecisions.md.

- **Handler Asynchronous Execution Model (`handlerAsyncMode`):**
  - **Decision:** Default `individual` for error isolation and parallel start; optional `batch` for potential (minor) performance gains with many synchronous handlers.
  - **Rationale:** Prioritizes robustness by default, offers flexibility.

- **Memory Management for Handlers (Strong References):**
  - **Decision:** Strong references in the subscription registry. Users MUST explicitly `unsubscribe`.
  - **Rationale:** Predictable, standard JavaScript behavior. `WeakRef` adds complexity and browser compatibility concerns.

- **Event and Handler Validation:**
  - **Decision:** Primarily TypeScript compile-time checks. Minimal runtime validation for critical API inputs (e.g., `eventType` presence).
  - **Rationale:** Balances developer experience (DX) with basic runtime safety for JavaScript users.

- **Persistence Backend (In-Memory):**
  - **Decision:** In-memory persistence only for the current version. API designed for future pluggable storage.
  - **Rationale:** Simplifies initial implementation while allowing future extensibility.

- **Decorator Integration (`@eventMethod`):**
  - **Decision:** Recommended for convenience, but Eventuality accepts any object conforming to `EventHandler` (with a unique `id: symbol`).
  - **Rationale:** Flexibility and interoperability.

- **Dynamic Configuration:**
  - **Decision:** Only `debugMode` and `waitTimeout` are dynamically configurable. Others are fixed at `getInstance()`.
  - **Rationale:** Prevents unpredictable runtime state changes while allowing essential tuning.

- **Error Propagation and Callback Signature:**
  - **Decision:** Handler errors caught, passed to `EventualityOptions.handleError(error, event, handler)`. No automatic retries.
  - **Rationale:** Robust error isolation, user control over error handling strategy.

- **API Surface and Singleton Behavior:**
  - **Decision:** Only documented methods/properties are public. `getInstance` with new options (post-init) logs a warning and only updates dynamic configs.
  - **Rationale:** Clear API contract, maintains singleton integrity.

- **State Resetting (`_resetInstance`):**
  - **Decision:** Fully clears all internal state (subscriptions, persisted events, queue, flags).
  - **Rationale:** Ensures clean, repeatable tests.

- **Atomicidad/Transaccionalidad (Operations like persist then dispatch):**
  - **Decision:** Operations are not strictly atomic in a distributed transaction sense. The current design focuses on sequential execution within the `_processEventQueue` loop. If `_persistEvent` succeeds but a subsequent handler invocation (or the `handleError` callback itself) throws an unrecoverable error that halts the JavaScript environment, the persisted event remains.
  - **Rationale:** True atomic transactions for in-memory JavaScript operations add significant complexity. The error handling strategy aims to isolate handler failures and allow the bus to continue. The persistence of `REQUEST_EVENT` *before* dispatch is a deliberate choice for reliability of the request-response pattern.

## 6. Addressing Non-Functional Requirements (NFRs)

- **NFR1.1 (Efficiency & Scalability):**
  - `Map` lookups for registries provide good average-case performance.
  - Asynchronous processing prevents UI blocking.
  - Scalability for very high event volumes or subscriber counts would require benchmarking and potential optimization of matching algorithms or data structures if in-memory limits are hit.
- **NFR1.2 (Robustness & Memory Safety):**
  - Error isolation in handlers.
  - Strong references require manual `unsubscribe` (documented).
  - `_resetInstance` for test environments.
- **NFR1.3 (API Clarity):**
  - TypeScript interfaces and TSDoc.
  - Consistent method naming and parameters.
- **NFR1.4 (Modularity & Maintainability):**
  - Conceptual separation of concerns (managers).
  - Use of `EventualityError` and `EventualityLogger`.
- **NFR1.5 (Testability):**
  - `_resetInstance` method.
  - Clear separation of API and internal logic.

*(Refer to the Eventuality - Requirements Document for full NFR definitions.)*

## 7. Future Considerations and Extensibility

- **Pluggable Persistence:** Abstracting `persistedEventsStore` to allow external storage.
- **Middleware/Interceptors:** Hooks in publish/processing pipeline.
- **Advanced Querying for Persisted Events:** More complex querying capabilities.
- **Alternative Processing Strategies:** e.g., prioritized queues, concurrent processing.

## 8. Appendices

### Appendix A: Diagram Links

- **Core ERD:** Eventuality-CoreEntity_RelationshipDiagram.wsd
- **Subscription ERD:** Eventuality-ERD-Suscription.mermaid
- **Detailed Class Diagram:** Eventuality-DetailedClassDiagram.wsd
- **Detailed Component Diagram:** Eventuality-DetailedComponentDiagram.wsd
- **Publishing Data Flow:** Eventuality-EventPublishingDataFlow.wsd
- **Subscription Data Flow:** Eventuality-EventSubscriptionDataFlow.wsd
- *(Links to all other relevant sequence and use case diagrams can be found in Section 1.4 References)*

---
*End of Software Design Document*
