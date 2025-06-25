# Data Flow in the Eventuality System

## Overview

The Eventuality system is designed to facilitate efficient communication between components through an event-driven architecture. This document outlines the data flow within the system, detailing how data is processed from event publishing to subscription management and event persistence.

## Data Flow Components

1. **Event Publishing**
   - When a component (the Publisher) wants to send an event, it invokes the `publish` method of the Eventuality instance.
   - The event is encapsulated in a `BaseEvent` object, which includes the event type and any associated data.
   - The Eventuality system processes the event and determines the appropriate subscribers based on the event type and any specified filters (e.g., clusters).

2. **Subscription Management**
   - Subscribers register their interest in specific event types by calling the `subscribe` method.
   - Each subscription is associated with a handler function that will be invoked when the corresponding event is published.
   - The system maintains a registry of active subscriptions, allowing it to efficiently route events to the correct handlers.

3. **Event Delivery**
   - Upon publishing an event, the Eventuality system checks the subscription registry to identify all relevant subscribers.
   - The system then invokes the registered handler functions, passing the event data as an argument.
   - If a subscriber is not currently active, the system can deliver persisted events to them upon their registration, ensuring they receive relevant past events.

4. **Event Persistence**
   - Events can be marked for persistence, allowing them to be stored for future retrieval.
   - The Eventuality system manages a store of persisted events, which can be queried when new subscribers register.
   - This feature ensures that late subscribers can access events that occurred before their registration.

## Event Lifecycle

1. **Creation**: An event is created with a type and data.
2. **Publishing**: The event is published to one or more clusters.
3. **Queueing**: Events are added to a FIFO queue for processing.
4. **Delivery**: Handlers subscribed to the event type and cluster receive the event.
5. **Persistence**: If enabled, the event is stored and delivered to late subscribers.

## Example: Full Flow

```typescript
const event = { eventType: 'USER_REGISTERED', data: { userId: 1 } };
const handler = Object.assign((e) => console.log(e.data.userId), { id: Symbol('h'), className: 'UserComponent' });
const bus = Eventuality.getInstance();
bus.publish(event, new Set(['main']), true);
bus.subscribe(event, handler, 'main'); // Handler receives event immediately
```

## Request-Response Flow

```typescript
const requestEvent = { eventType: 'REQUEST_EVENT', data: { targetEvent: event, handler, cluster: 'main' } };
bus.request(requestEvent.data, new Set(['main']));
```

## Data Flow Diagrams

### 1. Event Publishing Flow

```plaintext
+----------------+       +---------------------+
|   Publisher     | ----> |   Eventuality Bus   |
+----------------+       +---------------------+
| publish(event)  |       | processEvent(event) |
+----------------+       +---------------------+
```

### 2. Subscription Management Flow

```plaintext
+----------------+       +---------------------+
|   Subscriber    | ----> |   Eventuality Bus   |
+----------------+       +---------------------+
| subscribe(type) |       | registerHandler(type)|
+----------------+       +---------------------+
```

### 3. Event Delivery Flow

```plaintext
+---------------------+       +---------------------+
|   Eventuality Bus   | ----> |   Subscriber        |
+---------------------+       +---------------------+
| deliver(event)      |       | handleEvent(event)  |
+---------------------+       +---------------------+
```

### 4. Event Persistence Flow

```plaintext
+---------------------+       +---------------------+
|   Eventuality Bus   | ----> |   Persisted Events  |
+---------------------+       +---------------------+
| persist(event)      |       | storeEvent(event)   |
+---------------------+       +---------------------+
```

## See also

- Sequence diagrams in `workDocuments/`

## Conclusion

The data flow within the Eventuality system is designed to ensure efficient and reliable communication between components. By leveraging an event-driven architecture, the system supports flexible event handling, subscription management, and event persistence, making it a robust solution for decoupled communication in web applications.
