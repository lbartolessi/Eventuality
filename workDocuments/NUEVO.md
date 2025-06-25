# Requirements Document: Eventuality System

## 1. Introduction

### 1.1 Purpose

The purpose of this document is to define the requirements for the "Eventuality" module (hereinafter referred to as "the system"), implemented in the file `src/Eventuality.ts`. Eventuality is a modular, fully-typed Event Bus framework, primarily designed for dashboard and map-based web applications, especially for managing communication between Web Components efficiently. It operates as a Singleton and facilitates decoupled communication through a publish-subscribe mechanism, ensuring type safety, non-blocking UI updates, and supporting asynchronous event processing, cluster-based subscriptions, event persistence, and debugging features. The architecture aims to be extensible and suitable for complex, interactive UIs.
Event persistence, a core feature, specifically aims to address the synchronization problem that can occur when "impatient publishers" emit events before "slow subscribers" are ready to listen, potentially leading to missed events.

### 1.2 Scope

This document covers the functional and non-functional requirements for the Eventuality system. It describes its capabilities for:

* Event definition and typing.
* Publishing events, potentially to specific "clusters".
* Subscribing to events, potentially within specific "clusters", with control over data passing (by value or by reference).
* Facilitating request-response patterns via a `request` method.
* Unsubscribing from events.
* Persisting events for late subscribers.
* Asynchronous event processing via an internal queue.
* Error handling for event processing.
* Debug mode for logging and diagnostics, which can be toggled dynamically.
* Singleton instance management, including reset capabilities for testing.
* Configurable delay for event processing.
* Adherence to a defined `EventualityInterface`.

The system is a TypeScript module intended for integration into client-side or server-side JavaScript/TypeScript applications.

### 1.3 Definitions, Acronyms, and Abbreviations

| Term/Acronym | Definition                                                                 |
|--------------|----------------------------------------------------------------------------|
| Event        | A significant occurrence or signal, represented by a `BaseEvent<D>` object (defined in `src/Eventuality.ts`), containing an `eventType` (string) and `data` (payload of type `D`). All events of the same type MUST have the same data structure, enforced by TypeScript. Event types are strings and should be unique. Events are defined statically. |
| Handler      | An `EventHandler<D>` function (defined in `src/Eventuality.ts`) that is executed in response to a specific event type. It receives the event's data payload. Handlers include metadata (`id: symbol`, optional `className?: string`, optional `tagName?: string`) for debugging and tracking. These `className` and `tagName` properties are typically populated automatically by a decorator like `@EventMethod` (defined in `src/decorators.ts`) when applied to handler methods within classes, enhancing debug log utility. Handlers should be idempotent. |
| Publisher    | A component that emits or sends an event using the `publish` method.       |
| Subscriber   | A component that registers an `EventHandler` for a specific event type and cluster using the `subscribe` method. |
| Cluster      | An alphanumeric string identifier used as a selection mechanism for event delivery. For a `publish` operation, `clusters` is a `Set<string>`. For a `subscribe` operation, `cluster` is a `string`. A handler executes if its subscribed `cluster` string is present in the publication's `clusters` set, or if the `*` wildcard applies. A falsy or unspecified `cluster` for subscription defaults to `'*'`. A falsy or unspecified `clusters` set for publication defaults to `Set(['*'])`. The special cluster `*` acts as a wildcard, matching any cluster. Clusters are assumed to be pre-validated by the component. |
| Persisted Event | An event that is stored by the system after being published with the `persist: true` flag (per event type and cluster). New subscribers to this event type within the same cluster will immediately receive the last persisted event data. |
| `REQUEST_EVENT` | A specific event type string (e.g., defined in an `EventTypes` enum in `src/eventTypes.ts`, typically as `'REQUEST_EVENT'`) used by the `request` method to signal that a component is now listening for a particular `targetEvent`. The event structure itself is `RequestEvent<T,D>` (defined in `src/Eventuality.ts`). |
| `RequestEventData` | The data payload structure for a `REQUEST_EVENT` (defined as `RequestEventData<T,D>` in `src/Eventuality.ts`), containing details about the `targetEvent` being requested, the `handler` that will process it, the `cluster` for the subscription, and an optional `isReference` flag. |
| Singleton    | A design pattern that restricts the instantiation of a class to a single object. Eventuality uses this pattern. |
| API          | Application Programming Interface.                                         |
| TBD          | To Be Determined.                                                          |
| FR           | Functional Requirement.                                                    |
| NFR          | Non-Functional Requirement.                                                |

### 1.4 References

* `src/Eventuality.ts`: The primary source code file for the system. It defines the `EventualityInterface` (as default export), core types like `BaseEvent<D>`, `EventHandler<D>`, `RequestEventData<T,D>`, `RequestEvent<T,D>`, and contains the `Eventuality` class implementation (not directly exported).
* `workDocuments/EVENTUALITY_SPECIFICATIONS.md`: The detailed specification document from which these requirements are refined (this may be an older reference if this current document supersedes parts of it).
* `src/eventTypes.ts`: (Currently not existing as a separate file). The definition of specific event type strings (e.g., `REQUEST_EVENT`) and their concrete interfaces/classes (e.g., `ExampleEvent1`) are expected to be managed by the developer. The `REQUEST_EVENT` type string and its `RequestEventData` structure are defined in `src/Eventuality.ts`.
* `src/decorators.ts`: Contains decorators like `@eventMethod` which might be used in conjunction with `Eventuality` (though not directly a dependency of `Eventuality.ts` itself).
* (Not available - To be filled in with links to relevant design documents, style guides, standards, or other related materials.)

### 1.5 Overview

This document is organized into the following sections:

* **Section 1 (Introduction):** Provides an overview of the document.
* **Section 2 (Overall Description):** Describes the product perspective, its functions, user characteristics, constraints, assumptions, and dependencies.
* **Section 3 (Specific Requirements):** Details the functional, non-functional, and interface requirements.
* **Section 4 (Other Requirements):** Placeholder for additional requirements.
* **Section 5 (Appendices):** Placeholder for supplementary information.

## 2. Overall Description

### 2.1 Product Perspective

The Eventuality system is a TypeScript library providing a Singleton event bus, primarily for client-side dashboard and map-based web applications, facilitating communication between Web Components. It allows different parts of an application to communicate without direct dependencies. Key features include statically defined and typed events, cluster-based routing, event persistence for late subscribers (addressing synchronization issues between components), and an asynchronous FIFO processing queue to ensure non-blocking UI updates.
The framework for which Eventuality is primarily intended may employ strategies to mitigate synchronization problems, such as defined components lifecycle (e.g., `init`, `subscriptions`, `render`, `listeners`, `start` phases) and prioritized loading of components (e.g., HIGH, MEDIUM, LOW priorities). Eventuality is designed to support and work effectively within such an ecosystem, particularly by ensuring that critical events like `REQUEST_EVENT` can be reliably persisted.

### 2.2 Product Functions

The core functions of the Eventuality system are:

* **Singleton Access:** Providing a single, globally accessible instance of the event bus.
* **Event Publishing:** Allowing components to publish events, optionally targeting specific clusters and specifying persistence.
* **Event Subscription:** Enabling components to subscribe handlers to specific event types within designated clusters, with control over how event data is passed (by value or by reference).
* **Event Requesting:** Providing a utility method to subscribe to an expected response event (with data passing control) and then publish a standardized `REQUEST_EVENT`, facilitating request-response patterns.
* **Event UnSubscription:** Allowing handlers to be removed from event subscriptions.
* **Event Persistence:** Storing specified events so that new subscribers immediately receive the latest instance of that event upon subscription.
* **Asynchronous Event Delivery:** Processing events from a queue to avoid blocking the main thread, delivering events to handlers asynchronously.
* **Error Handling:** Providing a configurable mechanism to handle errors occurring within event handlers, including wrapping non-Error objects.
* **Debug Mode:** Offering a mode for enhanced logging of event bus activities, which can be toggled dynamically.
* **Instance Management:** Providing a mechanism to reset the singleton instance, primarily for testing purposes.
* **Configurable Event Processing Delay:** Allowing configuration of the timeout used between processing queued events.

### 2.3 User Characteristics

The primary users are software developers building web applications with TypeScript/JavaScript, particularly those using Web Components or seeking a robust in-application eventing system. Users are expected to:

* Be proficient in TypeScript and modern JavaScript.
* Understand event-driven architecture and publish-subscribe patterns.
* Be familiar with asynchronous programming concepts (e.g., `Promise`, `async/await`, `setTimeout`).

### 2.4 Constraints

* **C1:** The system MUST be implemented as a Singleton, with a private or protected constructor and a static `getInstance()` method that returns an `EventualityInterface`.
* **C2:** The system MUST use TypeScript and leverage its type system for events (extending `BaseEvent<D>`) and handlers (`EventHandler<D>`). These core types are defined in `src/Eventuality.ts`.
* **C3:** Event processing (delivery to handlers) MUST be asynchronous (e.g., using `await new Promise(resolve => setTimeout(resolve, this.waitTimeout))`) to prevent blocking, with events processed sequentially from a FIFO queue. The `waitTimeout` MUST be configurable.
* **C4:** The system MUST support the concept of "clusters" (alphanumeric strings or `*`) for scoping events. The `publish` method accepts a `Set<string>` of target clusters. The `subscribe` method accepts a single `string` for the target cluster.
* **C5:** The system MUST support event persistence per event type and cluster.
* **C6:** The public API MUST adhere to the `EventualityInterface` as defined in `src/Eventuality.ts`.
* **C7:** A debug mode for logging (with specified emojis and format) MUST be available and dynamically toggleable via a public `debugMode` property.
* **C8:** A configurable error handling mechanism (`handleError` callback) for errors within event handlers MUST be provided. If an error is not an instance of `Error`, it must be wrapped.
* **C9:** The system should aim for minimal external runtime dependencies.
* **C10:** The event bus itself does not validate event types, data, or clusters; it assumes all input is valid and relies on TypeScript for compile-time safety and pre-validation by components.
* **C11:** The system SHALL provide a `request` method to simplify request-response patterns, as defined in `EventualityInterface`.

### 2.5 Assumptions and Dependencies

* **A1:** The system operates in a JavaScript environment that supports ES6+ features (Maps, Sets, Promises, async/await, Symbols) and `structuredClone()`.
* **A2:** Users are responsible for the logic within their `EventHandler` functions, which should be idempotent.
* **A3:** The `EventHandler` interface (including `id`, `className`, `tagName` properties) is defined in `src/Eventuality.ts`, and handlers are expected to conform to it, especially for debugging information.
* **A4:** The default cluster identifier if none is provided (or if a falsy value is provided for clusters) is `*`.
* **A5:** The system is primarily designed for in-process communication within a single JavaScript environment.

## 3. Specific Requirements

### 3.1 Functional Requirements

#### 3.1.1 Singleton Instance Management

* **FR1.1.1:** The system SHALL provide a static method `getInstance(options?: EventualityOptions): EventualityInterface` to retrieve the single instance of `Eventuality`.
* **FR1.1.2:** If `getInstance` is called for the first time, it SHALL create a new `Eventuality` instance (which implements `EventualityInterface`) using the provided `options`. The constructor MUST be private or protected.
* **FR1.1.3:** If `getInstance` is called subsequently with `options` when an instance already exists, it SHALL return the existing instance, the provided `options` SHALL be ignored, and a warning SHALL be logged to the console (e.g., `console.warn`) indicating options were ignored and suggesting `_resetInstance()` for test isolation.
* **FR1.1.4:** The system SHALL provide a static method `_resetInstance()` for testing purposes. This method SHALL nullify the current singleton instance and completely clear its internal state (subscriptions, persisted events, event queue, internal flags).
* **FR1.1.5:** All usage of the Eventuality system in examples, documentation, and tests MUST use `Eventuality.getInstance()`.

#### 3.1.2 Configuration

* **FR1.2.0:** The `EventualityOptions` object MAY be frozen internally for encapsulation after the first initialization.
* **FR1.2.1:** The system's constructor (invoked via `getInstance` on first call) SHALL accept an `EventualityOptions` object.
* **FR1.2.2:** `EventualityOptions` SHALL support an initial `debugMode` (boolean, default: `false`). The `Eventuality` instance SHALL expose `debugMode` as a public, writable boolean property, allowing dynamic changes to the debug status.
* **FR1.2.3:** `EventualityOptions` SHALL support a `defaultPersist` (boolean, default: `false`) to set the default persistence behavior for published events if not specified at publish time.
* **FR1.2.4:** `EventualityOptions` SHALL support a `handleError` callback `(error: Error, event: BaseEvent<any>) => void` for custom error handling. If not provided, errors SHALL be logged to `console.error`.
* **FR1.2.5:** The system SHALL provide a public method `isDebugMode(): boolean` to check the current debug mode status, reflecting the value of the public `debugMode` property. This method must reflect the correct status after `_resetInstance()` and re-initialization.
* **FR1.2.6:** `EventualityOptions` SHALL support a `waitTimeout` (number, default: `0`) to set the delay in milliseconds used in the asynchronous event processing loop (`setTimeout(resolve, this.waitTimeout)`).
* **FR1.2.7:** The `Eventuality` instance SHALL expose `waitTimeout` as a public, writable number property, allowing dynamic changes to this delay.

#### 3.1.3 Event Publishing

* **FR1.3.1:** The system SHALL provide a public method `publish<T extends BaseEvent<D>, D>(event: T, clusters?: Set<string>, persist?: boolean): void` as defined in `EventualityInterface`.
* **FR1.3.2:** The `event` parameter SHALL be an object conforming to `BaseEvent<D>`, containing `eventType` and `data`.
* **FR1.3.3:** The optional `clusters` parameter SHALL be a `Set<string>` of cluster IDs. If `clusters` is a falsy value (e.g., `null`, `undefined`, empty set leading to falsy interpretation by the component providing it) or not provided, it SHALL be treated as `Set<string>(['*'])`.
* **FR1.3.4:** The optional `persist` parameter (boolean) SHALL determine if the event is persisted. If not provided, the `defaultPersist` option from the constructor SHALL be used.
* **FR1.3.5:** Publishing an event SHALL add it (along with its `clusters` and resolved `persist` status) to an internal FIFO event queue for asynchronous processing.
* **FR1.3.6:** If `debugMode` is enabled, publishing an event SHALL log information about the event, target clusters, and persistence status using the specified format.
* **FR1.3.7:** If an event is published with `cluster == "*"` (i.e., `clusters = new Set(['*'])`), it SHALL be delivered to all subscribers of that event type, regardless of the clusters listed in their subscriptions.
* **FR1.3.8:** The `clusters` parameter must be a `Set<string>`.

#### 3.1.4 Event Subscription

* **FR1.4.1:** The system SHALL provide a public method `subscribe<D>(eventType: string, handler: EventHandler<D>, cluster?: string, isReference?: boolean): void` as defined in `EventualityInterface`.
* **FR1.4.2:** The `eventType` parameter SHALL be a string specifying the event type to subscribe to.
* **FR1.4.3:** The `handler` parameter SHALL be a function conforming to `EventHandler<D>`.
* **FR1.4.4:** The optional `cluster` parameter SHALL be a `string` representing the cluster ID. If `cluster` is a falsy value (e.g., `null`, `undefined`, empty string) or not provided, the handler SHALL be subscribed to the default cluster `'*'`.
* **FR1.4.4.1:** The optional `isReference` parameter (boolean) SHALL determine how the event data is passed to the handler. If `true`, the data is passed by reference. If `false` or not provided, the data is passed by value (deep-copied). Default value is `false`.
* **FR1.4.5:** A specific handler (identified by its `id: symbol`) is associated with a single `cluster` for a given `eventType`. If a subscription request is made for an existing handler (`id`) and `eventType` but with a new `cluster`, the new `cluster` SHALL replace the previously associated `cluster` for that handler and event type. The `cluster` acts purely as a condition to determine if the handler executes for a given publication. Handlers are uniquely identified by their `id: symbol` for a given `eventType` for subscription management.
* **FR1.4.6:** Upon successful subscription, if a persisted event exists for the subscribed `eventType` and the specified `cluster`, the handler SHALL be invoked asynchronously with the persisted event data (respecting the `isReference` flag of the current subscription for data passing).
* **FR1.4.7:** If `debugMode` is enabled and a persisted event is delivered upon subscription, a log entry SHALL be made using the specified format.
* **FR1.4.8:** If a handler subscribes with `cluster = '*'`, it SHALL receive all publications of that event type, regardless of the clusters listed in the publication, due to the `*` cluster representing the universal set.
* **FR1.4.9:** The `cluster` parameter must be a `string`.

#### 3.1.5 Event UnSubscription

* **FR1.5.1:** The system SHALL provide a public method `unsubscribe<D>(eventType: string, handler: EventHandler<D>): void` as defined in `EventualityInterface`.
* **FR1.5.2:** The `eventType` parameter SHALL be a string specifying the event type to unsubscribe from.
* **FR1.5.3:** The `handler` parameter SHALL be the specific handler function to remove (identified by its `id: symbol`).
* **FR1.5.4:** The specified handler SHALL be removed from its subscription for the given `eventType` (it is associated with only one cluster per event type).
* **FR1.5.5:** If a cluster's handler set for an event type becomes empty after unSubscription, that cluster entry MUST be cleaned up.
* **FR1.5.6:** If all clusters for an event type become empty of handlers, that event type entry MUST be cleaned up from the main subscriptions map.

#### 3.1.6 Event Processing and Delivery

* **FR1.6.1:** The system SHALL maintain an internal event queue, implemented as a FIFO (First-In, First-Out) structure.
* **FR1.6.2:** Event processing SHALL be asynchronous. Each event is processed using `await new Promise(resolve => setTimeout(resolve, this.waitTimeout))` before invoking its handlers, ensuring the main thread is released. `this.waitTimeout` is a configurable public property. Events are processed sequentially from the queue to maintain emission order.
* **FR1.6.3:** A `processing` flag SHALL prevent concurrent processing of the queue.
* **FR1.6.4:** For each event dequeued:
  * **FR1.6.4.1:** If `persist` is true for the event, the event SHALL be stored in `persistedEvents` map, keyed by `eventType` and `cluster` (for each cluster in the event's target clusters). Previous persisted event for the same key SHALL be overwritten.
  * For each `cluster` in the event's target `clusters`, the system SHALL determine if the event should be persisted or if an existing persisted event should be removed for that `eventType` and `cluster`:
    * **FR1.6.4.1.1: Conditions for Persistence:** The event SHALL be stored in the `persistedEvents` map (keyed by `eventType` and `cluster`, overwriting any previous one) if ANY of the following conditions are true:
      * a) The publication's `persist` parameter is explicitly `true`.
      * b) The publication's `persist` parameter is `undefined`, AND the system's `defaultPersist` option is `true`.
      * c) The event's `eventType` is `REQUEST_EVENT` (or an event type that extends it, matching the configured `REQUEST_EVENT` type string).
      * d) The target `cluster` (the current cluster being processed from the publication's set of clusters) is the global cluster `'*'`.
      * e) The publication's `persist` parameter is `false` (or `undefined` and `defaultPersist` is `false`), BUT there were no prior subscriptions for the event's `eventType` and this specific `cluster` at the time of publishing (a console warning SHALL be issued in this scenario, see FR1.6.10).
    * **FR1.6.4.1.2: Conditions for Removal of Persisted Event:** If none of the conditions in FR1.6.4.1.1 are met for the current `eventType` and `cluster` (meaning the effective intent was not to persist, and no overriding conditions applied), any existing persisted event for that `eventType` and `cluster` SHALL be removed.
  * **FR1.6.4.3:** For each handler subscribed to the event's `eventType`:
    * **FR1.6.4.3.1:** The system SHALL determine if the handler should execute by checking if the handler's subscribed `cluster` (string) is present in the publication's `clusters` set (`Set<string>`).
    * **FR1.6.4.3.2:** The handler SHALL be scheduled for execution if: (a) its subscribed `cluster` is `'*'`, or (b) the publication's `clusters` set contains `'*'`, or (c) the handler's subscribed `cluster` is present in the publication's `clusters` set.
    * **FR1.6.4.3.3:** A specific handler (identified by its `id: symbol`) SHALL execute at most once per publication of its associated event if the cluster conditions are met.
* **FR1.6.5:** Delivery to each handler SHALL occur asynchronously (e.g., `await new Promise(resolve => setTimeout(resolve, 0))` before each handler invocation).
* **FR1.6.5.1: Event Data Isolation for Handlers**
  * **Description:** To ensure handler isolation and prevent unintended side-effects, the `data` payload of the `BaseEvent` object passed to each `EventHandler` MUST be managed according to the `isReference` flag associated with the subscription.
  * **Acceptance Criteria (AC):**
    * AC-1.6.5.1.1: If the subscription (or `RequestEventData` for a `request` call) specified `isReference: false` (or it defaulted to `false`), before an `EventHandler` is invoked, the `event.data` it receives MUST be a distinct, deep-copied instance. It must not be a reference to the original event's data, the data object shared with other handlers for the same event, or the data object stored for persistence.
    * AC-1.6.5.1.2: If the subscription (or `RequestEventData`) specified `isReference: true`, the `event.data` passed to the handler MUST be a reference to the original event's data payload (or the persisted event's data payload).
    * AC-1.6.5.1.3: Deep copies (when `isReference: false`) SHOULD be performed using the `structuredClone()` global function.
    * AC-1.6.5.1.4: When data is passed by value (`isReference: false`), modifications made to the `event.data` object by one handler MUST NOT be visible to other handlers processing the same original event, nor affect the originally published or persisted event data. When data is passed by reference (`isReference: true`), modifications WILL be visible.
* **FR1.6.6:** Errors thrown by an event handler during invocation SHALL be caught.
* **FR1.6.7:** Caught errors SHALL be passed to the configured `handleError` function along with the event that caused the error. If the caught item is not an instance of `Error`, it MUST be wrapped in a new `Error` object before being passed to `handleError`.
* **FR1.6.8:** An error in one handler MUST NOT prevent other handlers for the same event or subsequent events in the queue from being processed.
* **FR1.6.9:** If `debugMode` is enabled, successful delivery of an event to a handler SHALL be logged using the specified format (emoji 👂️, event name, cluster, className, tagName).
* **FR1.6.10:** When an event is forcibly persisted for a cluster due to no prior subscriptions (as per FR1.6.4.2 Exception 2), a warning SHALL be logged to the console (e.g., `console.warn`) indicating the event type and cluster(s) for which persistence was forced. This warning occurs regardless of `debugMode`.

#### 3.1.7 Event Persistence Management

* **FR1.7.1:** The system SHALL maintain a structure (e.g., `Map<string, Map<string, BaseEvent<any>>>` where the first key is `eventType` and the second is `cluster`) to store events published with `persist: true`.
* **FR1.7.2:** When an event is published and determined to be persisted for a given `eventType` and `cluster` (due to `persist: true`, `defaultPersist: true`, being a `REQUEST_EVENT`, targeting the `*` cluster, or forced persistence for clusters without prior subscribers as detailed in FR1.6.4.1.1), it SHALL overwrite any previously persisted event for that same `eventType` and `cluster`.
* **FR1.7.3:** When an event is published with an initial intent *not* to persist (i.e., the `persist` parameter is explicitly `false`, or it is `undefined` and `defaultPersist` is `false`) for a given `eventType` and target `cluster`:
  * Any existing persisted event for that `eventType` and `cluster` SHALL be removed, **UNLESS** one of the following overriding conditions (detailed in FR1.6.4.1.1) mandates persistence for that specific `eventType` and `cluster`:
    * The event's `eventType` is `REQUEST_EVENT` (see FR1.7.5).
    * The target `cluster` is the global cluster `'*'` (see FR1.7.7).
    * Persistence is forced for that `cluster` due to no prior subscriptions for that `eventType` and `cluster` (see FR1.7.6 and FR1.6.10).
  * If none of these overriding conditions apply, the previously persisted event (if any) for that `eventType` and `cluster` is removed.
* **FR1.7.4:** When a new subscription is added for a specific `eventType` and `cluster`, if a persisted event exists for that `eventType` and `cluster`, the handler is invoked asynchronously with the persisted event data, respecting the `isReference` flag of the current subscription.
* **FR1.7.5:** `REQUEST_EVENT` (events whose `eventType` string matches the configured `REQUEST_EVENT` type) SHALL always be persisted for all their target clusters upon publication, regardless of the `persist` parameter value or the `defaultPersist` setting.
* **FR1.7.6:** If an event is published with the intent not to persist, but there are no prior subscriptions for a specific `eventType` and `cluster` combination targeted by the publication, the event SHALL be persisted for that specific `eventType` and `cluster`. A console warning SHALL be issued (see FR1.6.10).
* **FR1.7.7: Global Cluster '*' Persistence**
  * Events published to the global cluster `'*'` (i.e., when `'*'` is one of the target clusters in a publication, including when `clusters` defaults to `Set(['*'])`) SHALL always be persisted for the `'*'` cluster itself. This persistence occurs regardless of the publication's `persist` parameter value or the system's `defaultPersist` setting. This is because the global cluster `'*'` is often used to synchronize states that components must be able to retrieve at any time, even if loaded after the event was published.

#### 3.1.8 Debug Logging

* **FR1.8.1:** The system SHALL provide a private logging mechanism (e.g., a method like `logWithBox`) for debug messages.
* **FR1.8.2:** When `debugMode` is true, this logging mechanism SHALL format and `console.log` messages. Each log entry SHALL include a timestamp, a mode indicator with emoji, a state indicator with emoji, the event type, cluster(s), and optionally `className`, `tagName` of the handler, and event data. The specific emojis and states are:
    * Modes: `'PUB'` (Publish 📢), `'SUB'` (Subscribe/Subscription Processed 👂), `'COG'` (Cognition/Handler Processing ⚙️).
    * States: `'LOST'` (No subscribers found 🏝️), `'FOUND'` (Persisted event utilized 🛟), `'SYNC'` (Normal/Synchronized operation ⚓️).
  * **FR1.8.2.1: Event Publication Log:**
    * Mode: `'PUB'` (📢).
    * State: `'SYNC'` (⚓️) for normal publication, or `'LOST'` (🏝️) if the system detects no current subscriptions for any of the event's target clusters and event type at the time of publication.
    * Details: `eventType`, target `clusters` (Set<string>), the `persist` flag value (boolean) used for the publication, and `event.data`.
  * **FR1.8.2.2: Event Handler Processing Log:**
    * Mode: `'COG'` (⚙️).
    * State: `'SYNC'` (⚓️) if processing a regularly queued event, or `'FOUND'` (🛟) if the event being processed by the handler was originally delivered as a persisted event.
    * Details: `eventType`, `clusters` (of the original publication that led to this handler call), `handler.className`, `handler.tagName` (if present), and `event.data` received by the handler.
  * **FR1.8.2.3: Persisted Event Delivery on New Subscription Log:**
    * Mode: `'SUB'` (👂).
    * State: `'FOUND'` (🛟).
    * Details: `eventType`, the subscribed `cluster` (string), `handler.className`, `handler.tagName` (if present). (Event data may optionally be logged here if deemed useful).
  * Note: The console warning for forced persistence (FR1.6.10) is separate and occurs regardless of `debugMode`.
* **FR1.8.3:** Debug mode should not significantly impact performance or memory usage when disabled. Debug logs should be clear, concise, and visually distinguishable (e.g., using a boxed format).

#### 3.1.9 Event Requesting

* **FR1.9.1:** The system SHALL provide a public method `request<T extends BaseEvent<D>, D>(requestDetails: { targetEvent: T; handler: EventHandler<D>; cluster: string; isReference?: boolean; }, clustersToPublishRequestEvent: Set<string>): void` as defined in `EventualityInterface`.
* **FR1.9.2:** The `requestDetails` parameter SHALL be an object containing:
  * `targetEvent: T`: The event instance (type and data structure) that the requester expects to receive. Its `eventType` property will be used for subscription.
  * `handler: EventHandler<D>`: The handler to process the `targetEvent` when it's published.
  * `cluster: string`: The cluster on which to subscribe for `targetEvent`.
  * `isReference?: boolean`: Optional. If `true`, data for the `targetEvent` will be passed by reference to the `handler`. Defaults to `false` (pass by value).
* **FR1.9.3:** The `clustersToPublishRequestEvent` parameter SHALL be a `Set<string>` indicating the clusters to which the meta `REQUEST_EVENT` will be published.
* **FR1.9.4:** The `request` method SHALL first subscribe the `requestDetails.handler` to the `requestDetails.targetEvent.eventType` on the specified `requestDetails.cluster`, using the `requestDetails.isReference` flag (defaulting to `false` if not provided).
* **FR1.9.5:** After successful subscription, the `request` method SHALL publish a `REQUEST_EVENT` (e.g., an event where `eventType` is `EventTypes.REQUEST_EVENT`).
  * **FR1.9.5.1:** The payload of this `REQUEST_EVENT` SHALL conform to `RequestEventData<T, D>` (defined in `src/Eventuality.ts`), containing the `targetEvent`, `handler`, `cluster`, and the resolved `isReference` flag from the `requestDetails` object.
  * **FR1.9.5.2:** This `REQUEST_EVENT` SHALL be published to the `clustersToPublishRequestEvent`.
* **FR1.9.6:** The purpose of this method is to simplify a common pattern where a component needs to signal its interest in an event (and subscribe to it) and then notify other components (by publishing `REQUEST_EVENT`) that this event is now being listened for, potentially triggering a provider to publish the `targetEvent`.
* **FR1.9.7:** The `REQUEST_EVENT` event type string (e.g., a constant like `REQUEST_EVENT_TYPE_STRING`) and its `RequestEventData<T,D>` payload structure (including `RequestEvent<T,D>`) MUST be defined. The `RequestEventData` and `RequestEvent` structures are defined in `src/Eventuality.ts`. The specific `REQUEST_EVENT` type string is defined by the developer, potentially as a constant within `src/Eventuality.ts` or an application-specific module, as a dedicated `src/eventTypes.ts` file for such constants does not currently exist as a convention.

### 3.2 Non-Functional Requirements

#### 3.2.1 Performance

* **NFR1.1:** Subscription and unSubscription operations SHOULD have low time complexity, typically O(1) or O(log N) relative to the number of clusters/handlers for a specific event type. (Specific benchmarks TBD)
* **NFR1.2:** Event emission/triggering SHALL be highly performant, even with a significant number of subscribed handlers. Time complexity for emission should ideally be O(M) where M is the number of listeners for the specific event being emitted. (Specific benchmarks TBD)
* **NFR1.3:** Memory usage per listener/subscription SHALL be minimal. Consideration SHOULD be given to using `WeakMap` or similar structures if applicable to avoid memory leaks from lingering subscriptions where components are removed from the DOM without explicit unSubscription.
* **NFR1.4:** The system should avoid memory leaks, particularly ensuring that unsubscribed handlers are properly garbage collected. Disabling `debugMode` should release any memory specifically used for debugging features.
* **NFR1.5:** The implementation should be optimized for performance and memory usage, especially in large applications with many events and subscribers.
* **NFR1.6:** The asynchronous nature of event processing should prevent UI blocking in client-side applications. The `waitTimeout` property allows fine-tuning this behavior.

#### 3.2.2 Reliability

* **NFR2.1:** The system MUST reliably deliver events to all correctly subscribed handlers as per the cluster and persistence rules.
* **NFR2.2:** The Singleton pattern implementation MUST ensure only one instance exists and is accessible.
* **NFR2.3:** The error handling mechanism MUST prevent handler errors from crashing the event bus or affecting other handlers.

#### 3.2.3 Usability (Developer Experience)

* **NFR3.1:** The API SHALL be intuitive, concise, and easy to learn and use.
* **NFR3.2:** The API MUST be thoroughly documented using TSDoc comments for all public methods, including clear examples, type definitions, parameter explanations, return types, thrown exceptions, and behavior of each method (especially regarding synchronicity and error handling).
* **NFR3.3:** Type safety through TypeScript generics (e.g., `BaseEvent<D>`, `EventHandler<D>`) SHALL be maximized to provide compile-time checks and excellent autocompletion for event types and payload structures.
* **NFR3.4:** Error messages originating from the Eventuality system itself (e.g., incorrect API usage, warnings from Singleton) SHALL be clear and informative.

#### 3.2.4 Maintainability

* **NFR4.1:** The codebase (`src/Eventuality.ts` and any auxiliary files) SHALL be well-structured, clean, and adhere to established TypeScript coding standards and best practices (e.g., strict type checking, clear separation of concerns).
* **NFR4.2:** The code SHALL include meaningful comments where necessary to explain complex logic, design decisions, or non-obvious behavior. All comments and identifiers MUST be in English.
* **NFR4.3:** The system SHALL be designed in a modular fashion to facilitate future extensions, modifications, or refactoring. Auxiliary classes, directories, or files may be created as needed. An unexported `EventualityError` class extending `Error` may be used internally.

#### 3.2.5 Testability

* **NFR5.1:** The system SHALL be designed to be highly testable, with an aim for extensive unit test coverage (e.g., >90%). Unit tests (e.g., using Vitest) MUST cover:
  * Event emission and subscription logic, including edge cases (e.g., subscribing after an event is published, unsubscribing during event processing).
  * Cluster logic (single string for subscribe, Set for publish, `*` wildcard behavior).
  * Event persistence (per event type and cluster, including overwriting and clearing persisted events).
  * Data passing logic (by value with `structuredClone()` vs. by reference based on `isReference` flag).
  * The `request` method functionality.
  * Debug mode logging and dynamic toggling of `debugMode`.
  * Dynamic adjustment of `waitTimeout`.
  * Error handling (ensuring errors are caught, passed to the `handleError` callback, and do not break the queue).
  * Singleton behavior: options affecting only first initialization, `_resetInstance()` allowing reconfiguration, correct debug log/warning emissions.
* **NFR5.2:** Clear interfaces and decoupled internal components (if any) should facilitate mocking and testing in isolation. The `_resetInstance()` method is crucial for test isolation, and tests MUST call it before each test (e.g., in a `beforeEach` block).
* **NFR5.2.1:** Test the dynamic toggling of the public `debugMode` property and its effect on logging.
* **NFR5.2.2:** Test the dynamic adjustment of the public `waitTimeout` property and its effect on event processing delay (conceptual, actual timing might be hard to assert precisely but sequence and non-blocking nature should be verified).
* **NFR5.3:** Asynchronous operations should be testable. Tests must ensure the event queue maintains order and does not block the UI.
* **NFR5.4:** Tests must always use `Eventuality.getInstance()` and never `new Eventuality()`.

#### 3.2.6 Security

* **NFR6.1:** The Eventuality system itself SHOULD NOT introduce security vulnerabilities. It should not, for example, allow arbitrary code execution through manipulated event names or payloads beyond the intended handler execution.
* **NFR6.2:** The system must provide clear guidance on unSubscription to prevent unintentional resource retention (memory leaks) if not used correctly by the developer.

#### 3.2.7 Extensibility

* **NFR7.1:** The system design SHOULD allow for future extensions, such as adding middleware/interceptors for events, or supporting different event storage/propagation strategies, without requiring major rewrites. (Specific extension points TBD)
* **NFR7.2:** The system is designed for browser environments but SHOULD NOT break in Node.js/test environments.

### 3.3 Interface Requirements

#### 3.3.1 User Interfaces

* Not applicable. The Eventuality system is a software library and does not have a direct graphical user interface, though `debugMode` logs to the console.

#### 3.3.2 Hardware Interfaces

* Not applicable.

#### 3.3.3 Software Interfaces (API)

* **IR1.1:** The system SHALL expose a programmatic API consumable by TypeScript and JavaScript code, strictly adhering to `EventualityInterface` (default export from `src/Eventuality.ts`).
* **IR1.2:** The system MUST implement the `EventualityInterface` exactly as follows (defined in `src/Eventuality.ts`):

    ```typescript
    // Core types also defined in src/Eventuality.ts:
    // export interface BaseEvent<D> { eventType: string; data: D; }
    // export interface EventHandler<D> { (event: BaseEvent<D>): void; id: symbol; className: string; tagName?: string; }
    // export interface RequestEventData<T extends BaseEvent<D>, D> { targetEvent: T; handler: EventHandler<D>; cluster: string; isReference?: boolean; }
    // export interface RequestEvent<T extends BaseEvent<D>, D> { eventType: 'REQUEST_EVENT'; data: RequestEventData<T,D>; }

    /**
     * Interface for the Eventuality event bus.
     */
    export default interface EventualityInterface {
        /** Publicly accessible and writable debug mode flag. */
        debugMode: boolean;

        /** Publicly accessible and writable wait timeout (in ms) for event processing loop. */
        waitTimeout: number;

        /**
         * Publishes an event to the specified clusters.
         * @param event The event object (extending BaseEvent) to publish.
         * @param clusters A set of cluster IDs to publish the event to. If falsy or not provided, defaults to Set(['*']).
         * @param persist If true, the event is persisted for new subscribers. If not specified, uses the default from the constructor.
         */
        publish<T extends BaseEvent<D>, D>(
            event: T,
            clusters?: Set<string>,
            persist?: boolean
        ): void;

        /**
         * Subscribes a handler to a specific cluster for a given event type.
         * @param eventType The string identifier of the event type to subscribe to.
         * @param handler The event handler function.
         * @param cluster A cluster ID (string) to subscribe to. If falsy or not provided, defaults to '*'.
         * @param isReference Optional. If true, event data is passed by reference; otherwise, by value (deep-copied). Defaults to false.
         */
        subscribe<D>(
            eventType: string,
            handler: EventHandler<D>,
            cluster?: string,
            isReference?: boolean
        ): void;

        /**
         * Unsubscribes a handler from a given event type.
         * @param eventType The string identifier of the event type to unsubscribe from.
         * @param handler The event handler function (identified by its id).
         */
        unsubscribe<D>(
            eventType: string,
            handler: EventHandler<D>
        ): void;

        /**
         * Initiates a request by subscribing to an expected event and publishing a REQUEST_EVENT.
         * The REQUEST_EVENT payload will signal to potential providers what event is being requested.
         * @param requestDetails An object containing the `targetEvent` to subscribe to, the `handler` to use,
         *                       the `cluster` for the subscription, and an optional `isReference` flag for data passing.
         * @param clustersToPublishRequestEvent The clusters to which the meta REQUEST_EVENT will be published.
         */
        request<T extends BaseEvent<D>, D>(
            requestDetails: {
              targetEvent: T;
              handler: EventHandler<D>;
              cluster: string;
              isReference?: boolean;
            },
            clustersToPublishRequestEvent: Set<string>
        ): void;
    }
    ```

* **IR1.3:** The system SHALL expose a static `getInstance(options?: EventualityOptions): EventualityInterface` method for obtaining the Singleton instance.
* **IR1.4:** The system SHALL expose a static `_resetInstance(): void` method for testing.
* **IR1.5:** The system SHALL expose a public instance method `isDebugMode(): boolean`.
* **IR1.6:** The system SHALL accept `EventualityOptions` (passed to `getInstance` on first call):

    ```typescript
    export interface EventualityOptions {
        debugMode?: boolean;        // Initial debug mode. Default: false.
        defaultPersist?: boolean;   // Default persistence for publish. Default: false.
        handleError?: (error: Error, event: BaseEvent<any>) => void; // Custom error handler.
        waitTimeout?: number;       // Initial delay (ms) in event processing loop. Default: 0.
    }
    ```

* **IR1.7:** Core event types (`BaseEvent<D>`, `EventHandler<D>`, `RequestEventData<T,D>`, `RequestEvent<T,D>`) are defined in `src/Eventuality.ts` and are integral to the API. Specific event type strings (e.g., for `REQUEST_EVENT`) and their concrete interface/class definitions (e.g., `ExampleEvent1`) are defined by the developer as needed; currently, there isn't a separate conventional `src/eventTypes.ts` file for these.
* **IR1.8:** The `clusters` parameter in the `publish` method MUST be a `Set<string>`. The `cluster` parameter in the `subscribe` method MUST be a `string`.
* **IR1.9:** All public methods and properties MUST be documented with TSDoc, including parameters, return values (if any), and side effects.

#### 3.3.4 Communications Interfaces

* Not applicable, assuming the Eventuality system is for in-process eventing.

## 4. Other Requirements

* **OR1 (Code Style):** Code MUST adhere to project-defined linting rules (e.g., ESLint, Prettier). All identifiers and comments MUST be in English.
* **OR2 (Compatibility):** The compiled JavaScript should be compatible with modern browsers and Node.js LTS versions. (Specific targets TBD, but usage of ES6+ features like Maps, Sets, Symbols, async/await, and `structuredClone()` is expected).
* **OR3 (Licensing):** (Not available - To be filled in with the intended software license, e.g., MIT, Apache 2.0).
* **OR4 (Dependency and Configuration Management):** Any changes to dependencies or configuration files (e.g., `package.json`, `tsconfig.json`, test configurations) from the project's baseline MUST be documented (e.g., in an `ISSUES.md` or similar project log), including reasons and versions.

## 5. Appendices

* **Appendix A: Event Flow Diagram (Conceptual)**
* (Not available - A diagram illustrating the lifecycle of an event from publish, through queue, to handler invocation, including persistence, would be beneficial.)
* **Appendix B: Cluster Usage Examples**
* (Not available - Examples demonstrating how clusters, including the `*` wildcard, can be used to isolate or broadcast events between different parts of an application.)
* **Appendix C: Detailed Specifications Reference**
* The document `workDocuments/EVENTUALITY_SPECIFICATIONS.md` serves as the detailed source for many of these requirements.

---
*_*End of Requirements Document*_*
