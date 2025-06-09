# Eventuality – Sequence Diagram: Remove Persisted Event (Verbal Description)

This document provides a detailed, step-by-step, and pedagogical explanation of the logic and structure represented in the "Remove Persisted Event" sequence diagram (`Eventuality-RemovePersistedEventSequence.dot`). By following this description, you can reproduce a functionally identical diagram in any language or tool, and also implement the same logic and algorithm in any programming language.

---

## 1. Overview

This sequence describes what happens when a **Publisher** publishes an event with the explicit instruction that it should **not** be persisted (`persist=false`). The system must ensure that any previously persisted copies of this event (for the specified clusters) are removed from storage, so that future subscribers do not receive outdated or unwanted events.

---

## 2. Actors and Components

- **Publisher:** The external entity that initiates the publication of an event, specifying that it should not be persisted.
- **Eventuality (Bus):** The central orchestrator that manages event publication, persistence, and removal.
- **Persisted Events Store:** Internal storage that holds events which have been persisted for later delivery to subscribers.

---

## 3. Step-by-Step Logic

### Step 1: Publisher Publishes a Non-Persistent Event

- The **Publisher** calls the `publish(event, clusters, persist=false)` method on the **Eventuality** bus.
- The parameters specify the event to publish, the target clusters, and explicitly set `persist` to `false`.

### Step 2: Eventuality Removes Persisted Events

- Upon receiving the publish request, **Eventuality** checks the `persist` flag.
- Since `persist` is `false`, **Eventuality** instructs the **Persisted Events Store** to remove any previously persisted copies of the event for the specified clusters.
- This ensures that no outdated or unwanted events remain in storage, and future subscribers will not receive them.

---

## 4. Pseudocode Summary

The following pseudocode summarizes the sequence:

```
function publish(event, clusters, persist):
    if persist == false:
        PersistedEventsStore.remove(event, clusters)
    // Continue with normal publish logic (e.g., handler delivery)
```

---

## 5. Implementation Guidance

- The persisted events store must support efficient removal of events by event type and cluster.
- The removal operation should be performed before or alongside the normal event delivery logic, to guarantee consistency.
- This logic is essential for systems where event persistence is optional and must be tightly controlled to prevent delivery of stale or irrelevant events.
- The system should ensure that only the intended events are removed, based on both event type and cluster.

---

By following this description, you can reproduce a functionally identical sequence diagram
in any modeling tool, and implement the same persisted event removal logic in any
programming language.
