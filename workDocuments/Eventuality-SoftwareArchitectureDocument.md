# Software Architecture Document: Eventuality System

## 1. Introduction

### 1.1 Purpose

The purpose of this document is to describe the software architecture of the Eventuality system. It outlines the system's structure, key components, interfaces, data flow, and design decisions, providing a high-level understanding of how the system is organized and operates. This document serves as a guide for developers, maintainers, and stakeholders involved with the Eventuality module.

### 1.2 Scope

This document focuses on the internal architecture of the core Eventuality event bus as implemented in `src/Eventuality.ts` and its related concepts defined in the provided documentation. It covers the logical organization, process flow, data management, and deployment considerations. It references the public API defined by `EventualityInterface` but does not detail the usage of the API itself, which is covered in the Requirements Document (Section 3.3.3) and TSDoc comments.

### 1.3 Definitions, Acronyms, and Abbreviations

Refer to Section 1.3 of the Requirements Document (`/home/lbartolessi/Workspaces/Eventuality/documentation/Eventuality-RequirementsDocument.md`) for a comprehensive list of definitions, acronyms, and abbreviations used within the context of the Eventuality system.

### 1.4 References

* `/home/lbartolessi/Workspaces/Eventuality/documentation/Eventuality-RequirementsDocument.md`: Eventuality Requirements Document.
* `/home/lbartolessi/Workspaces/Eventuality/documentation/Eventuality_UseCaseSpecificationReport.md`: Eventuality Use Case Specification Report.
* `/home/lbartolessi/Workspaces/Eventuality/documentation/Eventuality-CoreEntity_RelationshipDiagram.md`: Eventuality Core Entity-Relationship Diagram (Verbal Description).
* `/home/lbartolessi/Workspaces/Eventuality/documentation/Eventuality-EventPublishingDataFlow.md`: Eventuality Detailed Event Publishing Data Flow (Verbal Description).
* `/home/lbartolessi/Workspaces/Eventuality/documentation/Eventuality-EventSubscriptionDataFlow.md`: Eventuality Unified Event Subscription Data Flow (Verbal Description).
* `/home/lbartolessi/Workspaces/Eventuality/src/Eventuality.ts`: Eventuality Core Source Code.
* `/home/lbartolessi/Workspaces/Eventuality/src/decorators.ts`: Eventuality Decorators Source Code.
* Diagram files in `/home/lbartolessi/Workspaces/Eventuality/documentation/` (e.g., Class, Component, Logical Architecture, Data Flow diagrams).

## 2. Architectural Representation

The architecture of the Eventuality system is described using multiple views to provide a comprehensive understanding:

* **Logical View:** Describes the system's static structure in terms of classes, interfaces, and packages, highlighting key abstractions and their relationships.
* **Process View:** Describes the system's concurrency and control flow, focusing on the asynchronous event processing mechanism.
* **Data View:** Describes the key data structures managed by the system, such as the event queue, subscription registry (detailing handler uniqueness and cluster management), and persisted events store (including wildcard logic).
* **Deployment View:** Describes how the system is mapped onto the execution environment.

These views are supported by diagrams (referenced where available) and verbal descriptions derived from the source code and documentation.

## 3. Architectural Goals and Constraints

The architecture is guided by the Non-Functional Requirements (NFRs) and Constraints (Cs) outlined in the Requirements Document (`/home/lbartolessi/Workspaces/Eventuality/documentation/Eventuality-RequirementsDocument.md`). Key architectural goals and constraints include:

* **Singleton Pattern (C1, FR1.1):** Ensure a single, globally accessible instance of the event bus.
* **Type Safety (C2, NFR3.3):** Leverage TypeScript for strong typing of events and handlers.
* **Asynchronous Processing (C3, FR1.5, NFR1.6):** Implement a non-blocking, asynchronous event processing mechanism using a queue, configurable delay, and configurable handler invocation granularity (individual or batch).
* **Cluster-based Scoping (C4, FR1.3.3, FR1.4.4):** Support logical grouping and routing of events and subscriptions using clusters.
* **Event Persistence (C5, FR1.7):** Provide a mechanism to store events for delivery to late subscribers.
* **API Adherence (C6, IR1.1):** Strictly adhere to the defined `EventualityInterface`.
* **Dynamic Debugging (C7, FR1.2.2, FR1.8):** Allow dynamic toggling of a debug mode with detailed logging.
* **Robust Error Handling (C8, FR1.7, NFR2.3):** Catch and handle errors in event handlers without disrupting the bus, providing detailed context to the error callback.
* **Minimal Dependencies (C9):** Aim for a lean implementation with few external runtime dependencies.
* **Testability (NFR5.1, NFR5.2):** Design for high unit test coverage, including a reset mechanism for test isolation.
* **Maintainability (NFR4.1, NFR4.2):** Ensure a clean, well-structured, and well-commented codebase.
* **Performance (NFR1.1, NFR1.2, NFR1.3, NFR1.5):** Optimize for low latency and minimal memory usage, especially for core operations.


The logical view describes the system's primary abstractions and their relationships.

### 4.1 Key Abstractions and Components

Based on `src/Eventuality.ts` and the conceptual diagrams, the core logical components and abstractions are:

* **`Eventuality` (Core Facade / Singleton Implementation):**
  * The central class implementing the `EventualityInterface`.
  * Manages the singleton instance (`Eventuality.instance`).
  * Orchestrates the interactions between internal components (conceptual managers).
  * Holds configuration options (`options`, `debugMode`, `waitTimeout`).
  * Provides the public API methods (`publish`, `subscribe`, `unsubscribe`, `request` with its defined signature).
  * Ref: `Eventuality` class in `src/Eventuality.ts`, FR1.1, C1.
  * See: `Eventuality Detailed Class Diagram`, `Eventuality Detailed Logical Architecture`.

* **`EventualityInterface` (Public API Contract):**
  * Defines the public methods and properties exposed by the Eventuality singleton.
  * Ensures a consistent and stable API for consumers.
  * Ref: `EventualityInterface` in `src/Eventuality.ts`, C6, IR1.2.
  * See: `Eventuality Detailed Class Diagram`, `Eventuality Detailed Component Diagram`, `Eventuality Detailed Logical Architecture`.

* **Event Definitions (`BaseEvent<D>`, `RequestEventData<D>`, `RequestEvent<D>`):**
  * Interfaces defining the structure of events and their payloads.
  * `BaseEvent<D>` is the fundamental event structure.
  * `RequestEventData<D>` defines the payload for `REQUEST_EVENT` (containing `targetEvent`, `handler`, `cluster`).
  * `RequestEvent<D>` defines the structure of the `REQUEST_EVENT` itself (wrapping `RequestEventData`).
  * Ref: Interfaces in `src/Eventuality.ts`, Section 1.3, IR1.7.
  * See: `Eventuality Detailed Class Diagram`, `Eventuality Detailed Component Diagram` ("Event Definitions" package).

* **`EventHandler<D>` (Handler Contract):**
  * Interface defining the structure of an event handler function, including metadata (`id`, `className`, `tagName`).
  * The `id: symbol` is mandatory and used for uniqueness.
  * See: `Eventuality Detailed Class Diagram`, `Eventuality Detailed Component Diagram` ("Event Definitions" package).

* **`EventualityOptions` (Configuration):**
  * Interface defining the options passed during the initial `getInstance` call.
  * Includes `debugMode`, `defaultPersist`, `handleError`, `waitTimeout`.
  * Ref: Interface in `src/Eventuality.ts`, FR1.2, IR1.6.
  * See: `Eventuality Detailed Class Diagram`, `Eventuality Detailed Component Diagram` ("Event Definitions" package).
  * `handleError` signature: `(error: Error, event: BaseEvent<any>, handler?: EventHandler<any>) => void;`.

* **`EventualityLogger` (Debug Logging):**
  * A utility class providing static methods for formatted console logging when `debugMode` is enabled.
  * Ref: `EventualityLogger` class in `src/Eventuality.ts`, FR1.8.
  * See: `Eventuality Detailed Class Diagram`, `Eventuality Detailed Component Diagram`, `Eventuality Detailed Logical Architecture`.

* **`EventualityError` (Custom Error):**
  * A custom error class for Eventuality-specific errors.
  * Ref: `EventualityError` class in `src/Eventuality.ts`, NFR4.1.
  * See: `Eventuality Detailed Class Diagram`.

* **`@eventMethod` (Decorator):**
  * A method decorator (defined in `src/decorators.ts`) that transforms a class method into an `EventHandler<D>` instance, automatically populating `id`, `className`, and `tagName`.
  * Ref: `src/decorators.ts`, Section 1.3 (Handler definition).
  * See: `Eventuality Detailed Class Diagram`, `Eventuality Detailed Component Diagram`.

### 4.2 Conceptual Internal Managers

While not explicitly separate classes in `src/Eventuality.ts`, the `Eventuality` class conceptually manages several internal responsibilities:

* **Subscription Manager:** Handles the registration, lookup, and removal of `EventHandler` instances based on `eventType` and `cluster`. (Ref: FR1.4, FR1.5, FR1.6.4.3, FR1.7.6, UC-002, UC-003, UC-005, UC-009).
* **Persistence Manager:** Stores and retrieves persisted events based on `eventType` and `cluster` (including wildcard logic). Handles the logic for when to persist or remove events. (Ref: FR1.6.4.1, FR1.7, UC-004, UC-006, UC-008).
* **Event Queue:** A FIFO queue storing events awaiting asynchronous processing. (Ref: C3, FR1.3.5, FR1.6.1, FR1.6.2).
* **Event Processor:** The logic responsible for dequeuing events, applying persistence/removal rules, finding matching subscribers, and invoking handlers asynchronously. (Ref: FR1.6).
* **Configuration Manager:** Manages the system's configuration options (`debugMode`, `waitTimeout`, `defaultPersist`, `handleError`). (Ref: FR1.2).

These conceptual managers are orchestrated by the `Eventuality` class itself.
See: `Eventuality Detailed Logical Architecture`.

### 4.3 Package Structure

The source code is logically organized, primarily within `src/Eventuality.ts` which contains most core elements, and `src/decorators.ts`. A conceptual package structure could group these as follows:

* `eventuality.interfaces`: Contains core interfaces (`BaseEvent`, `EventHandler`, `EventualityInterface`, etc.).
* `eventuality.core`: Contains the main `Eventuality` class implementation.
* `eventuality.errors`: Contains `EventualityError`.
* `eventuality.logging`: Contains `EventualityLogger`.
* `eventuality.decorators`: Contains the `@eventMethod` decorator and related types.

Ref: `Eventuality Detailed Package Diagram`.

## 5. Process View

The process view describes the system's runtime behavior, focusing on concurrency and control flow.

### 5.1 Asynchronous Event Processing Loop

* Event processing is driven by an internal, asynchronous loop.
* When an event is published, it is added to a FIFO queue (`FR1.3.5`, `FR1.6.1`).
* A processing flag (`FR1.6.3`) ensures only one instance of the processing loop runs at a time.
* The loop repeatedly dequeues events.
* Before processing each event's handlers, the loop introduces a configurable delay (`await new Promise(resolve => setTimeout(resolve, this.waitTimeout))`) to prevent blocking the main thread (`C3`, `FR1.5`).
* Handlers for a single event are invoked asynchronously according to the configured `handlerAsyncMode` (FR1.5.1).

Ref: `Publish an Event (UC004)` Sequence Diagram, `Eventuality Detailed Logical Architecture` (Processor component).

### 5.2 Control Flow

* **Publish:** Event added to queue (using `defaultPersist` or explicit `persist` flag) -> Trigger async processing loop (if not running).
* **Subscribe:** Handler registered/updated -> Check for and deliver persisted events asynchronously.
* **Unsubscribe:** Handler removed.
* **Request:** Handler subscribed to target event -> `REQUEST_EVENT` published (added to queue).
* **Processing Loop:** Dequeue event -> Apply persistence/removal rules -> Find matching handlers -> Invoke each handler asynchronously.

Ref: `Eventuality-EventPublishingDataFlow.md`, `Eventuality-EventSubscriptionDataFlow.md`, Use Case Specifications.

## 6. Data View

The data view describes the significant data structures managed by the Eventuality system.

* **Event Queue:** A temporary, in-memory FIFO queue holding events awaiting processing. (Ref: FR1.6.1).
* **Subscription Registry:** An in-memory structure (conceptually `Map<eventType: string, Map<cluster: string, Map<handlerId: symbol, EventHandler<any>>>>`) storing registered handlers. Each `EventHandler` (identified by its unique `id: symbol`) is tied to a specific `eventType` (defined within the Handler itself) and registered under a `cluster`. A handler can only have one active subscription.
* **Persisted Events Store:** An in-memory structure (conceptually `Map<eventType: string, Map<cluster: string, BaseEvent<any>>>`) storing the latest persisted event for each event type and cluster combination, including handling of wildcard (`'*'`) clusters. (Ref: C5, FR1.7, UC-004, UC-006, UC-008).
* **Configuration Data:** The `EventualityOptions` object, frozen after initialization, holding system settings. (Ref: FR1.2).
  * `handleError` signature: `(error: Error, event: BaseEvent<any>, handler?: EventHandler<any>) => void;`.
Ref: `Eventuality-CoreEntity_RelationshipDiagram.md`, `Conceptual Data Flow Diagram for Eventuality (Level 0/1)`.

## 7. Deployment View

The deployment view describes how the system is mapped onto the execution environment.

* Eventuality is designed as a **software library** (`Eventuality.ts` compiled to `Eventuality.js`).
* It is deployed **in-process** within a host application (e.g., a web application running in a browser or a Node.js application).
* The host application's components interact with Eventuality via its public API (`EventualityInterface`).
* Eventuality itself does not typically require separate deployment units or external services, although the host application might interact with external services.

Ref: `Conceptual Deployment Diagram for Eventuality`.

## 8. Key Design Decisions

* **Singleton Pattern:** Chosen to provide a single, easily accessible, global event bus instance within the application context (C1, FR1.1). This simplifies access but requires careful management (e.g., `_resetInstance` for testing).
* **Asynchronous, Queued Processing:** Decouples event publishing from handler execution, preventing UI blocking and ensuring events are processed in the order they were published (C3, FR1.6, NFR1.6). The configurable `waitTimeout` allows balancing responsiveness and processing speed.
* **In-Memory Persistence:** Persisted events are stored directly in the Eventuality instance's memory. This is suitable for in-process synchronization but means persistence is lost if the application instance is reset or the environment reloads (C5, FR1.7).
* **Cluster Logic:** Provides a flexible mechanism for routing events to specific subsets of subscribers, supporting both specific clusters and a global wildcard (`C4`, `FR1.3.3`, `FR1.4.4`).
* **Strict Persistence Rules:** Detailed rules define exactly when an event is persisted or removed, including special handling for `REQUEST_EVENT` and the `'*'` cluster, and forced persistence for events without prior subscribers (FR1.6.4.1, FR1.7). This addresses the "impatient publisher" problem.
* **Decorator for Handlers (`@eventMethod`):** Simplifies the creation of `EventHandler` instances from class methods and automates the population of debug metadata (`className`, `tagName`) (Ref: `src/decorators.ts`).
* **Centralized Error Handling:** All handler errors are caught and routed to a single, configurable `handleError` callback, preventing individual handler failures from breaking the bus (C8, FR1.6.7, NFR2.3).
* **Detailed Debug Logging:** Provides extensive, structured logging when enabled, crucial for understanding event flow and diagnosing issues in complex applications (C7, FR1.8). The `EventualityLogger` class encapsulates this logic.
* **Type-Driven Design:** Heavy reliance on TypeScript interfaces and generics ensures compile-time type safety and improves developer experience (C2, NFR3.3).

## 9. Future Considerations and Extensibility

The current architecture provides a solid foundation. Potential future extensions could include:

* **Middleware/Interceptors:** Adding hooks into the publish or processing pipeline to allow custom logic (e.g., validation, transformation, logging) before or after events are processed or delivered (NFR7.1).
* **External Persistence:** Supporting external storage mechanisms (e.g., IndexedDB, server-side database) for persistence beyond the lifetime of the application instance.
* **Different Processing Strategies:** Allowing alternative processing models (e.g., concurrent handler execution for a single event, prioritized queues).
* **Plugin System:** Formalizing extension points for adding custom features.

## 10. Appendices

* **Appendix A: Event Flow Diagram (Conceptual):** Refer to `Eventuality-EventPublishingDataFlow.md` and `Eventuality-EventSubscriptionDataFlow.md` for detailed descriptions of the publishing and subscription data flows.
* **Appendix B: Cluster Usage Examples:** Refer to Section 1.3 (Definitions - Cluster) and relevant Use Cases in the Requirements Document and Use Case Specification Report.
* **Appendix C: Detailed Specifications Reference:** Refer to `Eventuality-RequirementsDocument.md` and `workDocuments/EVENTUALITY_SPECIFICATIONS.md`.

---

*\_*End of Software Architecture Document*\_*
