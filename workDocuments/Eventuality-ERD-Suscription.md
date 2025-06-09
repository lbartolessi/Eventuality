# Detailed Verbal Description of the Eventuality Subscription ERD Diagram

This document provides a detailed and pedagogical explanation of all the logic and relationships represented in the Entity-Relationship Diagram (ERD) for event subscription in the Eventuality system. By following this description, anyone can reproduce a functionally identical diagram in any language or tool, as well as implement the same data logic and relationships in any programming language or relational database.

---

## 1. Main Entities

### 1.1 EventType

- Represents a unique event type within the system.
- Has a primary key attribute: `eventTypeName` (string), which uniquely identifies the event type.

### 1.2 EventInstance

- Represents a concrete occurrence of an event.
- Attributes:
  - `eventId` (string, PK): Unique identifier for the event instance.
  - `timestamp` (datetime): When the event occurred.
  - `source` (string): Origin of the event.
  - `data` (json): Payload or data associated with the event.
  - `correlationId` (string, optional): Correlation ID for traceability.
  - `eventTypeName` (string, FK): Reference to the event type (`EventType`).
- Each event instance is associated with a single event type.

### 1.3 Cluster

- Represents a logical cluster or grouping for subscriptions.
- Primary key attribute: `clusterName` (string).

### 1.4 SubscriberClass

- Represents the class or component that defines one or more event handlers.
- Primary key attribute: `className` (string).

### 1.5 Handler

- Represents an event handler, usually a method or function.
- Attributes:
  - `handlerId` (string, PK): Unique identifier for the handler (can be a symbol).
  - `methodName` (string): Name of the method or function.
  - `className` (string, FK): Reference to the subscriber class (`SubscriberClass`).
  - `eventTypeName` (string, FK): Reference to the event type handled (`EventType`).
- Each handler is defined by a class and is associated with a specific event type.

### 1.6 Subscription

- Represents the subscription of a handler to a specific event type in a given cluster.
- Attributes:
  - `handlerId` (string, PK, FK): Reference to the handler.
  - `eventTypeName` (string, FK): Reference to the event type.
  - `clusterName` (string, FK): Reference to the cluster.
- The primary key is composite: (`handlerId`, `eventTypeName`, `clusterName`).

---

## 2. Relationships Between Entities

- **EventType** has many **EventInstance**: Each event type can have multiple associated occurrences (instances).
- **Subscription** targets **EventType**: Each subscription is associated with a specific event type.
- **EventType** is the basis for **Handler**: Each handler is associated with an event type it can handle.
- **SubscriberClass** defines many **Handler**: A class can define multiple handlers.
- **Cluster** hosts many **Subscription**: Each cluster can have multiple subscriptions.
- **Handler** fulfills many **Subscription**: A handler can be subscribed to multiple events and clusters.

---

## 3. Subscription Logic and Algorithm

1. **Definition of Event Types:**
   - Define the event types (`EventType`) that can exist in the system.
2. **Creation of Subscriber Classes:**
   - Define the classes (`SubscriberClass`) that will contain the handlers.
3. **Definition of Handlers:**
   - Each handler (`Handler`) is associated with a class and a specific event type.
4. **Creation of Clusters:**
   - Define the clusters (`Cluster`) that will group subscriptions.
5. **Subscription:**
   - Create a subscription (`Subscription`) that links a handler, an event type, and a cluster.
   - There cannot be two subscriptions with the same combination of handler, event type, and cluster (composite primary key).
6. **Event Publishing:**
   - When an event occurs, create an instance (`EventInstance`) associated with an event type.
   - The system can look up all active subscriptions for that event type and cluster, and execute the corresponding handlers.

---

## 4. Implementation Considerations

- All foreign keys must maintain referential integrity.
- The composite primary key of `Subscription` ensures no duplicates.
- The model is easily extensible to add more attributes to entities or relationships.
- It can be implemented in any language (TypeScript, Java, Python, SQL, etc.) using classes, tables, or equivalent structures.

---

## 5. Visual Legend (colors and styles)

- Entity: #F9E79F (Light Yellow)
- Relation: #2E86C1 (Blue)
- Note: #EAEAEA (Light Gray)
- System boundary/background: #FDEBD0 (Beige)
- Font: Roboto

---

This description allows you to reproduce the diagram and the subscription logic of Eventuality in any environment, ensuring the same structure and behavior as the original.
