# Eventuality – Sequence Diagram: Subscribe to Event (Verbal Description)

This document provides a detailed, step-by-step, and pedagogical explanation of the logic and structure represented in the "Subscribe to Event" sequence diagram (`Eventuality-SubscribeEventSequence.dot`). By following this description, you can reproduce a functionally identical diagram in any language or tool, and also implement the same logic and algorithm in any programming language.

---

## 1. Overview

This sequence describes what happens when a **Subscriber** subscribes to a specific event type and cluster in the Eventuality system. The process ensures that the handler is registered, any relevant persisted events are delivered immediately, and the action is logged for traceability.

---

## 2. Actors and Components

- **Subscriber:** The external entity that requests to subscribe a handler to a specific event type and cluster.
- **Eventuality (Bus):** The central orchestrator that manages subscriptions, event delivery, and logging.
- **Subscription Registry:** Internal storage that keeps track of all registered handlers, organized by event type and cluster.
- **Persisted Events Store:** Internal storage for events that have been persisted for later delivery.
- **Handler:** The callback function or object registered by the subscriber to process events.
- **EventualityLogger:** Component responsible for logging all significant actions and state changes during the process.

---

## 3. Step-by-Step Logic

### Step 1: Subscriber Requests Subscription

- The **Subscriber** calls the `subscribe(eventType, handler, cluster)` method on the **Eventuality** bus.
- The parameters specify the event type, the handler function or object, and the cluster of interest.

### Step 2: Register Handler

- **Eventuality** registers the handler in the **Subscription Registry** under the specified event type and cluster.
- This ensures that the handler will receive all future events of that type and cluster.

### Step 3: Find and Deliver Persisted Events

- **Eventuality** queries the **Persisted Events Store** to find any events that:
  - Match the subscribed `eventType`.
  - Belong to the specified `cluster` (or match via wildcard logic, if supported).
- For each matching persisted event found, the **Persisted Events Store** delivers the event to the registered **Handler**.
- The handler's callback is invoked with the event data, as if the event had just been published.

### Step 4: Log the Subscription

- **Eventuality** calls **EventualityLogger** to log the subscription action, including event type, cluster, handler reference, and any relevant metadata.

---

## 4. Pseudocode Summary

The following pseudocode summarizes the sequence:

```
function subscribe(eventType, handler, cluster):
    SubscriptionRegistry.registerHandler(eventType, handler, cluster)
    persistedEvents = PersistedEventsStore.find(eventType, cluster)
    for event in persistedEvents:
        handler(event)
    EventualityLogger.logSubscribe(eventType, handler, cluster)
```

---

## 5. Implementation Guidance

- The subscription registry must efficiently store and retrieve handlers by event type and cluster.
- The persisted events store should support efficient lookup by event type and cluster.
- Delivery of persisted events should use the same handler invocation logic as for newly published events.
- Logging should be performed at each significant step for traceability and debugging.
- This logic ensures that subscribers receive all relevant events, even those published before their subscription, and that the system remains observable and maintainable.

---

By following this description, you can reproduce a functionally identical sequence diagram
in any modeling tool, and implement the same subscription and persisted event delivery
logic in any programming language.
