# Eventuality – Core Entity-Relationship Diagram (Verbal Description, Expanded)

This document provides a detailed, step-by-step, and pedagogical explanation of the core entities and their relationships in the Eventuality system, as represented in the "Eventuality - Core Entity-Relationship Diagram". The description is designed so that, by following this logic, you can reproduce a functionally identical diagram in any language or tool, and also implement the same conceptual model in any programming language.

---

## 1. Entities

### **Eventuality**
- The central bus of the system.
- Manages the registration of handlers and the storage (persistence) of events.

### **Event**
- Represents the information that is published and transmitted.
- Has attributes such as `eventType`, `data`, and is associated with one or more `clusters`.

### **Handler**
- A callback function that is executed when a matching event is received.
- Associated with a specific `eventType` and a `cluster`.

### **Cluster**
- A logical label or grouping for events and handlers.
- Allows segmentation of event delivery.

### **Subscriber**
- The entity (user, component, etc.) that subscribes a handler to an event.

### **Publisher**
- The entity that publishes an event to the system.

---

## 2. Relationships (with Cardinality)

- **Subscriber → Handler (1..*):**  
  A subscriber registers one or more handlers for specific event types and clusters.

- **Publisher → Event (1..*):**  
  A publisher creates and publishes one or more events.

- **Eventuality → Handler (*):**  
  Eventuality manages any number of registered handlers.

- **Eventuality → Event (*):**  
  Eventuality stores (persists) any number of events for later delivery if needed.

- **Handler → Event (1..1):**  
  Each handler is associated with exactly one event type (one-to-one logical/indirect relation).

- **Handler → Cluster (1):**  
  Each handler is associated with exactly one cluster (or the wildcard `'*'`).

- **Event → Cluster (1):**  
  Each event is associated with exactly one cluster (logical/indirect relation).

---

## 3. Diagram Legend

- **Blue:** Publisher, Subscriber, Cluster
- **Green:** Eventuality (Bus)
- **Orange:** Handler
- **Gray:** Event
- **Dashed lines:** Logical or indirect relationships (not direct references in code, but conceptual associations)

---

## 4. Implementation Notes

- This entity-relationship model is conceptual and helps clarify the architecture and dependencies of the Eventuality system.
- Some entities (like Handler as a function, or Eventuality as a singleton) are logical rather than physical database entities.
- The relationships shown are sufficient to understand the publish-subscribe and persistence mechanisms at the heart of Eventuality.

---

By following this description, you can reproduce the core entity-relationship diagram in any diagramming tool or use it as a conceptual model for implementation in any programming language.
