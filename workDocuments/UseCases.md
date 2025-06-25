# Use Cases for Eventuality System

## Overview

This document summarizes the various use cases for the Eventuality system, illustrating how it can be utilized in different scenarios. Each use case describes the interactions between publishers, subscribers, and the event bus, highlighting the flexibility and capabilities of the Eventuality framework.

## Use Cases

### UC-001: Initialize Eventuality
**Actors:** System/Developer  
**Description:** The system or developer initializes the Eventuality bus, potentially with configuration options.  
**Preconditions:** The Eventuality library is included in the project.  
**Postconditions:** The Eventuality instance is created and ready for use.  
**Steps:**
1. Call `Eventuality.getInstance()` with optional configuration parameters.
2. The system prepares the event bus for operation.

---

### UC-002: Register a Handler (Subscribe)
**Actors:** Subscriber  
**Description:** A subscriber registers a handler for a specific `eventType` and `cluster`.  
**Preconditions:** The Eventuality instance is initialized.  
**Postconditions:** The handler is registered and ready to receive events.  
**Steps:**
1. Call `Eventuality.subscribe(eventType, handler, options)`.
2. The system stores the handler in the subscription registry.

---

### UC-003: Unregister a Handler (Unsubscribe)
**Actors:** Subscriber  
**Description:** A subscriber removes a previously registered handler.  
**Preconditions:** The handler is already registered.  
**Postconditions:** The handler is removed from the subscription registry.  
**Steps:**
1. Call `Eventuality.unsubscribe(eventType, handler)`.
2. The system removes the handler from the registry.

---

### UC-004: Publish an Event
**Actors:** Publisher  
**Description:** A publisher sends an event to the bus, optionally specifying target `clusters` and persistence behavior.  
**Preconditions:** The Eventuality instance is initialized.  
**Postconditions:** The event is published and delivered to relevant subscribers.  
**Steps:**
1. Create an event object with `eventType` and `data`.
2. Call `Eventuality.publish(event)` with optional parameters for clusters and persistence.
3. The system processes the event and notifies subscribers.

---

### UC-005: Subscribe to an Event Type
**Actors:** Subscriber  
**Description:** A subscriber registers to receive events of a specific type.  
**Preconditions:** The Eventuality instance is initialized.  
**Postconditions:** The subscriber is notified of future events of the specified type.  
**Steps:**
1. Call `Eventuality.subscribe(eventType, handler)`.
2. The system adds the handler to the subscription registry for the specified event type.

---

### UC-006: Deliver Persisted Events on Subscription
**Actors:** Subscriber  
**Description:** Upon subscription, Eventuality delivers relevant persisted events to the new handler.  
**Preconditions:** The Eventuality instance has persisted events.  
**Postconditions:** The subscriber receives past events that match the subscription criteria.  
**Steps:**
1. When a new handler is registered, the system checks for persisted events.
2. Relevant events are delivered to the new handler.

---

### UC-007: Request an Event (Request-Response Pattern)
**Actors:** Publisher  
**Description:** A publisher initiates a request and receives a response via events.  
**Preconditions:** The Eventuality instance is initialized.  
**Postconditions:** The publisher receives a response to the request.  
**Steps:**
1. Call `Eventuality.request(event)` to initiate a request.
2. The system processes the request and invokes the appropriate handler.
3. The response is sent back to the publisher through an event.

---

## Practical Use Cases

### Basic Event Publishing
```typescript
const event = { eventType: 'USER_REGISTERED', data: { userId: 1 } };
bus.publish(event, new Set(['main']));
```

### Subscribing and Unsubscribing
```typescript
const handler = Object.assign((e) => console.log(e.data.userId), { id: Symbol('h'), className: 'UserComponent' });
bus.subscribe(event, handler, 'main');
bus.unsubscribe(event, handler);
```

### Persistence for Late Subscribers
```typescript
bus.publish(event, new Set(['main']), true);
bus.subscribe(event, handler, 'main'); // Handler receives event immediately
```

### Error Handling
```typescript
try {
  bus.unsubscribe(event, handler); // If handler not found, throws error
} catch (e) {
  console.error(e);
}
```

### Request-Response Pattern
```typescript
const requestEvent = { eventType: 'REQUEST_EVENT', data: { targetEvent: event, handler, cluster: 'main' } };
bus.request(requestEvent.data, new Set(['main']));
```

### Clustered Event Delivery
```typescript
bus.publish(event, new Set(['clusterA', 'clusterB']));
```

### Debug Logging
```typescript
const bus = Eventuality.getInstance({ debugMode: true });
bus.publish(event, new Set(['main'])); // Logs detailed info
```

---

## Conclusion

The Eventuality system provides a robust framework for managing events in web applications. These use cases illustrate its flexibility and the various ways it can be integrated into applications to facilitate decoupled communication between components.
