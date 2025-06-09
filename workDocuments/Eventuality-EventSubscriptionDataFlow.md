# Eventuality – Unified Event Subscription Data Flow (Verbal Description, Expanded)

This document provides a comprehensive, step-by-step, and pedagogical explanation of the unified event subscription logic as represented in the "Eventuality - Unified Subscription Flow" diagram. The description is designed so that, by following this logic, you can reproduce a functionally identical diagram in any language or tool, and also implement the exact same algorithm in any programming language.

---

## 1. Entry Point: Subscribing to an Event

The process starts when a **Subscriber** calls the `subscribe(eventType, handler, cluster)` method on the **Eventuality** system.

- `eventType`: The type of event the handler is interested in.
- `handler`: The callback function to be invoked when the event occurs.
- `cluster`: The cluster name (string) to which the handler subscribes. This can be a specific name or the wildcard `'*'`.

---

## 2. Check for Existing Handler (Duplicate Subscription Handling)

The system checks if there is already a handler registered for the same `eventType` and with the same handler identity (reference or id).

- **If such a handler exists:**
  - The system updates the cluster associated with this handler and eventType, replacing the previous cluster value with the new one provided in the subscription.
- **If such a handler does not exist:**
  - The system registers the new handler for the given eventType and cluster.

---

## 3. Persisted Events Check

After updating or registering the handler, the system checks if there are any **persisted events** that match the subscription criteria.

- The system searches its persisted events store for events where:
  - `event.eventType == eventType`
  - AND (`event.cluster == cluster` OR `cluster == '*'` OR `event.cluster == '*'`)

---

## 4. Delivering Persisted Events

- **If matching persisted events are found:**
  - For each matching persisted event, the system invokes the handler's callback, passing the event as an argument (possibly asynchronously).
- **If no matching persisted events are found:**
  - The process ends; the handler will only be invoked for future events.

---

## 5. End of Flow

- Once all matching persisted events (if any) have been delivered to the handler, the subscription process is complete.

---

## 6. Pseudocode Summary

Below is a pseudocode summary of the above logic:

```pseudocode
function subscribe(eventType, handler, cluster):
    // 1. Check for existing handler for this eventType
    if handler_exists(eventType, handler):
        // 2. Update cluster for this handler and eventType
        update_handler_cluster(eventType, handler, cluster)
    else:
        // 3. Register new handler
        register_handler(eventType, handler, cluster)

    // 4. Check for matching persisted events
    matching_events = [
        event for event in persisted_events
        if event.eventType == eventType and (
            event.cluster == cluster or
            cluster == '*' or
            event.cluster == '*'
        )
    ]

    // 5. Deliver persisted events if any
    for event in matching_events:
        handler(event)

    // 6. Done
```

---

## 7. Implementation Notes

- The logic ensures that duplicate subscriptions (same eventType and handler) do not create multiple registrations, but instead update the cluster as needed.
- The wildcard cluster `'*'` acts as a global subscription, both for event clusters and handler clusters.
- The process is deterministic and can be implemented in any language or system that supports basic data structures and control flow.

---

By following this description, you can reproduce the unified event subscription flow in any diagramming tool or implement the logic in any programming language.
