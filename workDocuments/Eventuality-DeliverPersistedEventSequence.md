# Eventuality – Sequence Diagram: Deliver Persisted Event on Subscription (Verbal Description)

This document provides a detailed, step-by-step, and pedagogical explanation of the logic and structure represented in the "Deliver Persisted Event on Subscription" sequence diagram (`Eventuality-DeliverPersistedEventSequence.dot`). By following this description, you can reproduce a functionally identical diagram in any language or tool, and also implement the same logic and algorithm in any programming language.

---

## 1. Overview

This sequence describes what happens when a **Subscriber** subscribes to an event type and cluster in the Eventuality system. The focus is on delivering any events that were previously persisted (i.e., published before the subscriber registered) and match the subscription criteria. This ensures that late subscribers do not miss important events.

---

## 2. Actors and Components

- **Subscriber:** The external entity that registers interest in a specific event type and cluster.
- **Eventuality (Bus):** The central orchestrator that manages subscriptions and event delivery.
- **Persisted Events Store:** Internal storage for events that have been persisted for later delivery.
- **Handler:** The callback function or object registered by the subscriber to process events.

---

## 3. Step-by-Step Logic

### Step 1: Subscriber Registers a Handler

- The **Subscriber** calls the `subscribe(eventType, handler, cluster)` method on the **Eventuality** bus.
- The parameters specify the type of event, the handler to be invoked, and the cluster of interest.

### Step 2: Eventuality Searches for Persisted Events

- Upon receiving the subscription, **Eventuality** queries the **Persisted Events Store** to find any events that:
  - Match the subscribed `eventType`.
  - Belong to the specified `cluster` (or match via wildcard logic, if supported).

### Step 3: Delivery of Persisted Events

- For each matching persisted event found, the **Persisted Events Store** delivers the event to the registered **Handler**.
- The handler's callback is invoked with the event data, as if the event had just been published.

---

## 4. Pseudocode Summary

The following pseudocode summarizes the sequence:

```
function subscribe(eventType, handler, cluster):
    registerHandler(eventType, handler, cluster)
    persistedEvents = PersistedEventsStore.find(eventType, cluster)
    for event in persistedEvents:
        handler(event)
```

---

## 5. Implementation Guidance

- The subscription process must always include a check for matching persisted events immediately after registering the handler.
- The persisted events store should support efficient lookup by event type and cluster.
- Delivery of persisted events should use the same handler invocation logic as for newly published events.
- The system should ensure that handlers receive all relevant events, regardless of whether they were published before or after the subscription.
- This logic is essential for systems where events may be published before all interested parties are ready to receive them (e.g., in distributed or asynchronous environments).

---

By following this description, you can reproduce a functionally identical sequence diagram
in any modeling tool, and implement the same persisted event delivery logic in any
programming language.
