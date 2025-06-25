# Architecture of the Eventuality System

## 1. Introduction

The Eventuality system is designed as a modular, event-driven architecture that facilitates decoupled communication between components in web applications. This document outlines the architectural design, key components, and their interactions within the system. It provides a comprehensive understanding of how the Eventuality system operates and integrates with other components.

## 2. Architectural Overview

The architecture of the Eventuality system can be described through multiple views:

### 2.1 Logical View

The logical view illustrates the static structure of the system, highlighting the key abstractions and their relationships. The primary components include:

- **Eventuality (Core Facade):** The central class that implements the EventualityInterface, managing event publishing, subscription, and persistence.
- **EventualityInterface:** Defines the public API for interacting with the Eventuality system.
- **Event Definitions:** Interfaces for event structures, including BaseEvent, RequestEventData, and RequestEvent.
- **EventHandler:** Interface for event handler functions, ensuring type safety and consistency.

### 2.2 Process View

The process view describes the concurrency and control flow within the system. It focuses on the asynchronous processing of events, including:

- **Event Queue:** A FIFO structure that manages events awaiting processing.
- **Event Processor:** Responsible for dequeuing events, applying business rules, and invoking registered handlers.
- **Subscription Manager:** Manages the registration and deregistration of event handlers.

### 2.3 Data View

The data view outlines the key data structures managed by the Eventuality system:

- **Subscription Registry:** A mapping of event types to their respective handlers, ensuring uniqueness and efficient lookup.
- **Persisted Events Store:** A storage mechanism for events that need to be retained for late subscribers.
- **Configuration Data:** The EventualityOptions object that holds system settings, such as debug mode and timeout configurations.

### 2.4 Deployment View

The deployment view describes how the Eventuality system is integrated into the execution environment:

- **In-Process Library:** Eventuality is deployed as a software library within the host application, such as a web application or Node.js environment.
- **Single Instance:** The system operates as a singleton, ensuring a single point of interaction for all event bus operations.
- **No External Dependencies:** The architecture does not require additional deployment units or external services, simplifying integration.

## 3. Key Components

### 3.1 Eventuality Class

The Eventuality class serves as the core facade, orchestrating interactions between internal components and providing the public API. It manages configuration options, event processing, and subscription management.

### 3.2 EventualityInterface

This interface defines the methods available to users of the Eventuality system, including publish, subscribe, unsubscribe, and request methods.

### 3.3 Event Definitions

Event definitions provide a structured way to define events within the system, ensuring type safety and consistency across event handling.

### 3.4 EventHandler Interface

The EventHandler interface specifies the structure of event handler functions, including metadata for uniqueness and identification.

## 4. Diagrams

Diagrams illustrating the architecture, including class diagrams, component diagrams, and data flow diagrams, are included in the appendices. These visual representations complement the textual descriptions and provide clarity on the system's structure and interactions.

## 5. Conclusion

The Eventuality system's architecture is designed to support robust, type-safe, and extensible event-driven communication. By adhering to modular principles and providing clear abstractions, it enables developers to integrate event-driven patterns into their applications effectively. This document serves as a foundational reference for understanding the architectural design and guiding future development efforts.

## Appendix Architecture of Eventuality

Eventuality is built around a modular, event-driven architecture. Its core is a type-safe event bus that supports clusters, persistence, and advanced error handling.

### Main Components

- **Eventuality (Singleton)**: Central event bus, manages event publishing, subscriptions, and persistence.
- **`BaseEvent<T>`**: Interface for all events, with `eventType` and `data`.
- **`EventHandler<T>`**: Function with metadata (`id`, `className`, `tagName`).
- **Logger**: Provides detailed, color-coded logs for all operations when `debugMode` is enabled.

### Event Flow

1. **Publish**: Events are published to clusters. Optionally persisted.
2. **Subscribe**: Handlers subscribe to event types and clusters.
3. **Delivery**: Events are delivered to all matching handlers. Persisted events are delivered to late subscribers.
4. **Unsubscribe**: Handlers can be removed from subscriptions.

### Sequence Example

```typescript
// Publish an event
bus.publish(event, new Set(['main']), true);
// Subscribe a handler
bus.subscribe(event, handler, 'main');
// Handler receives event (immediately if already published and persisted)
```

### Logger Example

When `debugMode` is enabled, operations are logged with emojis and color:

```text
📢 [PUB] [SYNC] [USER_REGISTERED] [main] UserComponent
```

### Diagrams

See `workDocuments/` for class, sequence, and data flow diagrams.
