# Eventuality – Detailed Component Diagram (Verbal Description)

This document provides a detailed, step-by-step, and pedagogical explanation of the logic and structure represented in the "Eventuality – Detailed Component Diagram" (`Eventuality-DetailedComponentDiagram.dot`). By following this description, you can reproduce a functionally identical diagram in any language or tool, and also implement the same architecture and logic in any programming language.

---

## 1. Overview

The Eventuality system is architected as a modular, event-driven bus with clear separation of concerns. Its main goal is to provide a robust, type-safe, and extensible publish-subscribe mechanism, supporting event persistence, cluster-based delivery, and request-response patterns. The system is composed of several interacting components, each with a well-defined responsibility.

---

## 2. Main Components and Their Roles

### 2.1. Core Bus

- **Eventuality (core bus, green):**
  - The central orchestrator of the system.
  - Exposes the main API for publishing, subscribing, unsubscribing, and requesting events.
  - Implements the `EventualityInterface` contract.
  - Coordinates all other components.

### 2.2. Interfaces and Contracts

- **EventualityInterface (purple):**
  - Defines the public API contract for the bus.
  - Methods: `publish`, `subscribe`, `unsubscribe`, `request`.

### 2.3. Logging and Error Handling

- **EventualityLogger (cyan):**
  - Handles all debug and trace logging for the system.
  - Receives calls from the core bus to log significant actions and state changes.

- **EventualityError (red):**
  - Custom error type for the system.
  - Used by the core bus to signal and propagate errors.

### 2.4. Configuration

- **EventualityOptions (yellow):**
  - Holds configuration options for the bus (e.g., debug mode, default persistence, error handler, timeouts).
  - Read by the core bus at initialization and runtime.

### 2.5. Internal Stores

- **EventQueue (light gray):**
  - FIFO queue for asynchronous event processing.
  - Used by the core bus to manage event delivery order and timing.

- **SubscriptionRegistry (light gray):**
  - Stores all registered handlers, organized by event type and cluster.
  - Managed by the core bus for efficient handler lookup and management.

- **PersistedEventsStore (light gray):**
  - Stores persisted events, organized by event type and cluster.
  - Allows delivery of past events to new subscribers.

### 2.6. Decorators and Advanced Registration

- **Decorators (violet):**
  - Mechanisms (such as `@eventMethod`) for advanced or declarative handler registration.
  - Used by the core bus to support decorator-based APIs.

### 2.7. Domain Entities

- **Event (gray):**
  - Represents an event to be published or persisted.
  - Contains `eventType`, `data`, and `clusters`.

- **Handler (orange):**
  - Represents a callback registered for a specific event type and cluster.

- **Cluster (blue):**
  - Logical grouping for event delivery and handler registration.

- **RequestDetails (light gray):**
  - Structure for request/response logic, holding the target event, handler, and cluster.

- **EventHandler (light gray):**
  - Signature/type for event handler callbacks.

- **RequestEvent / RequestEventData (purple):**
  - Structures supporting the request/response pattern.

### 2.8. Actors

- **Publisher (blue):**
  - External entity that publishes events to the bus.

- **Subscriber (blue):**
  - External entity that subscribes handlers to the bus.

---

## 3. Relationships and Data Flow

### 3.1. External API

- **Publisher** and **Subscriber** interact with the system exclusively through the `EventualityInterface`.
- The `EventualityInterface` is implemented by the core `Eventuality` component.

### 3.2. Core Bus Interactions

- The **Eventuality** bus:
  - Logs actions and state changes via **EventualityLogger**.
  - Throws errors using **EventualityError**.
  - Reads configuration from **EventualityOptions**.
  - Queues events in **EventQueue** for asynchronous processing.
  - Manages handler registration and lookup in **SubscriptionRegistry**.
  - Persists and retrieves events from **PersistedEventsStore**.
  - Supports decorator-based handler registration via **Decorators**.
  - Uses **RequestDetails** and **EventHandler** for advanced event/request logic.

### 3.3. Domain Logic

- **Eventuality** creates and reads **Event** and **Handler** objects as part of its core logic.
- **Handler** is associated with a **Cluster** (for delivery scoping) and implements the **EventHandler** signature.
- **Event** is associated with one or more **Cluster** instances (for delivery targeting).
- **RequestDetails** references a target **Event** and **EventHandler** for request/response flows.
- **RequestEvent** contains **RequestEventData**, which in turn references the target **Event** and **EventHandler**.

### 3.4. Decorators

- **Decorators** can create or register **EventHandler** instances, enabling declarative or metadata-driven handler registration.

### 3.5. Internal Stores

- **EventQueue** stores **Event** objects for processing.
- **SubscriptionRegistry** stores **Handler** objects for lookup and management.
- **PersistedEventsStore** stores **Event** objects for later delivery.

---

## 4. Color and Shape Legend

- **Green:** Core bus/component
- **Purple:** Interface/contract
- **Gray:** Event
- **Orange:** Handler
- **Blue:** Cluster, Publisher, Subscriber
- **Yellow:** Options/config
- **Cyan:** Logger
- **Red:** Error
- **Violet:** Decorator
- **Light Gray:** Internal store/auxiliary
- **Dashed lines:** Indirect or interface relation

---

## 5. Pseudocode Summary

The following pseudocode summarizes the component structure and interactions:

```
Component: Eventuality (core bus)
    Implements: EventualityInterface
    Uses:
        - EventualityLogger for logging
        - EventualityError for error signaling
        - EventualityOptions for configuration
        - EventQueue for event processing
        - SubscriptionRegistry for handler management
        - PersistedEventsStore for event persistence
        - Decorators for advanced handler registration
        - RequestDetails and EventHandler for request/response

Component: EventualityInterface
    Methods: publish, subscribe, unsubscribe, request

Component: EventualityLogger
    Receives logs from Eventuality

Component: EventualityError
    Used by Eventuality for error handling

Component: EventualityOptions
    Read by Eventuality for configuration

Component: EventQueue
    Stores Event objects for async processing

Component: SubscriptionRegistry
    Stores Handler objects by eventType/cluster

Component: PersistedEventsStore
    Stores Event objects by eventType/cluster

Component: Decorators
    Used for advanced handler registration

Component: Event
    Used by Eventuality, EventQueue, PersistedEventsStore

Component: Handler
    Used by Eventuality, SubscriptionRegistry

Component: Cluster
    Used by Handler, Event

Component: RequestDetails
    Used by Eventuality for request/response

Component: EventHandler
    Used by Handler, RequestDetails

Component: RequestEvent, RequestEventData
    Used for request/response pattern

Actors: Publisher, Subscriber
    Call EventualityInterface
```

---

## 6. Implementation Guidance

- Each component should be implemented as a distinct module or class, with clear interfaces and responsibilities.
- All interactions between components should follow the relationships described above.
- Internal stores (queues, registries, persisted stores) should be encapsulated and only accessible via the core bus.
- Logging, error handling, and configuration should be centralized and reusable.
- The system should be extensible, allowing new event types, handlers, and decorators to be added without modifying core logic.

---

By following this description, you can reproduce a functionally identical component
diagram in any modeling tool, and implement the same architecture and logic in any
programming language.
