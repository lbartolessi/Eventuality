# Eventuality – Detailed Class Diagram (Verbal Description)

This document explains the structure and relationships shown in `Eventuality-DetailedClassDiagram.dot`, following the conventions and style of the documentation in this project.

---

## Main Components

### Eventuality (Bus)

- **Type:** Core class (green)
- **Role:** Central singleton event bus. Responsible for event publishing, handler registration, event persistence, and request/response logic.
- **Key Methods:**  
  - `publish(event, clusters, persist)`
  - `subscribe(eventType, handler, cluster)`
  - `unsubscribe(eventType, handler, cluster)`
  - `request(requestDetails, clustersToPublishRequestEvent)`

### Event

- **Type:** Data class (gray)
- **Role:** Represents an event to be published or persisted. Contains `eventType`, `data`, and `clusters`.

### Handler

- **Type:** Data class (orange)
- **Role:** Represents a callback registered for a specific event type and cluster.

### Cluster

- **Type:** Data class (blue)
- **Role:** Logical grouping for event delivery and handler registration.

### Publisher / Subscriber

- **Type:** Actor (blue)
- **Role:** External entities that interact with the bus to publish events or register handlers.

### Interfaces and Auxiliaries

- **EventualityInterface:** API contract for the bus.
- **BaseEvent:** Generic event structure.
- **EventHandler:** Callback signature for event processing.
- **RequestEventData / RequestEvent:** Structures for request/response pattern.
- **EventualityOptions:** Configuration options for the bus.
- **RequestDetails:** Structure for request/response logic.
- **EventualityLogger:** Handles debug and event logging.
- **EventualityError:** Custom error type.
- **EventMethodDecorator / EventMethodOptions:** Support for decorator-based event handler registration.

---

## Relationships

- **Actors** (`Publisher`, `Subscriber`) use the **Eventuality** bus.
- **Eventuality** implements the **EventualityInterface** and manages/persists **Handler** and **Event** instances.
- **Handler** implements **EventHandler** and is associated with a **Cluster** and **Event**.
- **Event** is associated with one or more **Cluster** instances.
- **EventualityLogger** logs events, handlers, and requests.
- **RequestEventData** and **RequestEvent** support the request/response pattern.
- **EventualityOptions** configures the bus.
- **EventualityError** is used for error handling.
- **EventMethodDecorator** and **EventMethodOptions** support advanced handler registration.

---

## Color Legend

- **Green:** Eventuality (Bus)
- **Gray:** Event
- **Orange:** Handler
- **Blue:** Cluster, Publisher, Subscriber
- **Purple:** Interface
- **Yellow:** Options
- **Cyan:** Logger
- **Red:** Error
- **Violet:** Decorator
- **Light Gray:** Auxiliary classes
- **Dashed lines:** Interface or indirect relationships

---

## Notes

- The diagram is designed for clarity and completeness, showing both the API surface and the main internal relationships.
- The color and shape conventions follow the project’s `diagrams.md` guidelines for consistency across all documentation.
- This diagram should be used as a reference for implementation, extension, and onboarding of new developers.

---
