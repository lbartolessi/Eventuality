# Eventuality – Sequence Diagram: Handle Duplicate Subscription (Verbal Description)

This document provides a detailed, step-by-step, and pedagogical explanation of the logic and structure represented in the "Handle Duplicate Subscription" sequence diagram (`Eventuality-DuplicateSubscriptionSequence.dot`). By following this description, you can reproduce a functionally identical diagram in any language or tool, and also implement the same logic and algorithm in any programming language.

---

## 1. Overview

This sequence describes what happens when a **Subscriber** attempts to subscribe a handler to an event type and cluster, but a handler with the same reference is already registered for that event type. The system must detect this duplicate and update the handler's cluster association, rather than registering a new handler or duplicating the subscription.

---

## 2. Actors and Components

- **Subscriber:** The external entity that requests to subscribe a handler to a specific event type and cluster.
- **Eventuality (Bus):** The central orchestrator that manages subscriptions and handler registration.
- **Subscription Registry:** Internal storage that keeps track of all registered handlers, organized by event type and cluster.

---

## 3. Step-by-Step Logic

### Step 1: Subscriber Requests Subscription

- The **Subscriber** calls the `subscribe(eventType, handler, cluster)` method on the **Eventuality** bus.
- The parameters specify the event type, the handler function or object, and the cluster of interest.

### Step 2: Eventuality Checks for Duplicate Handler

- **Eventuality** queries the **Subscription Registry** to determine if a handler with the same reference (i.e., the same function or object) is already registered for the given `eventType`.
- If such a handler exists, it is considered a duplicate subscription.

### Step 3: Update Cluster Association

- Instead of registering a new handler or duplicating the subscription, **Eventuality** updates the cluster associated with the existing handler for that event type.
- This ensures that the handler will now receive events for the new cluster, and avoids multiple registrations of the same handler for the same event type.

---

## 4. Pseudocode Summary

The following pseudocode summarizes the sequence:

```
function subscribe(eventType, handler, cluster):
    if SubscriptionRegistry.hasHandler(eventType, handler):
        SubscriptionRegistry.updateCluster(eventType, handler, cluster)
    else:
        SubscriptionRegistry.registerHandler(eventType, handler, cluster)
```

---

## 5. Implementation Guidance

- The subscription registry must be able to efficiently check for existing handlers by both event type and handler reference.
- Updating the cluster should replace or add the new cluster to the handler's registration, depending on the system's cluster management logic.
- The system should avoid registering the same handler multiple times for the same event type, ensuring clean and predictable event delivery.
- This logic is essential for preventing memory leaks, redundant event processing, and unexpected handler behavior in event-driven systems.

---

By following this description, you can reproduce a functionally identical sequence diagram
in any modeling tool, and implement the same duplicate subscription handling logic in any
programming language.
