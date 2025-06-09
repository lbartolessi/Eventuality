# Eventuality – Sequence Diagram: Publish Event (Verbal Description)

This document provides a detailed, step-by-step, and pedagogical explanation of the logic and structure represented in the "Publish Event" sequence diagram (`PublishEventSequence.dot`). By following this description, you can reproduce a functionally identical diagram in any language or tool, and also implement the same logic and algorithm in any programming language.

---

## 1. Overview

The "Publish Event" sequence describes the process that occurs when a Publisher sends an event to the Eventuality bus. The flow covers handler discovery, event queuing, handler invocation, event persistence, and logging. Each component has a clear responsibility and interacts in a well-defined order.

---

## 2. Actors and Components

- **Publisher:** The external entity that initiates the event publication.
- **Eventuality (Bus):** The central orchestrator that manages event delivery, handler lookup, persistence, and logging.
- **Subscription Registry:** Internal store that keeps track of all registered handlers, organized by event type and cluster.
- **Handler(s):** Callback functions registered to receive events of specific types and clusters.
- **Event Queue:** FIFO queue that manages the order and timing of event delivery to handlers.
- **Persisted Events Store:** Internal store for events that need to be persisted for later delivery.
- **EventualityLogger:** Component responsible for logging all significant actions and state changes during the process.

---

## 3. Step-by-Step Logic

### Step 1: Publisher Initiates Event Publication

- The **Publisher** calls the `publish(event, clusters, persist)` method on the **Eventuality** bus.
- The parameters specify the event to publish, the target clusters, and whether the event should be persisted.

### Step 2: Handler Discovery

- **Eventuality** queries the **Subscription Registry** to find all handlers that are registered for the event's type and the specified clusters (including wildcard logic if applicable).

### Step 3: Logging the Publication

- **Eventuality** calls **EventualityLogger** to log the publication attempt, including event type, clusters, and other relevant metadata.

### Step 4: Event Queuing

- **Eventuality** enqueues the event into the **Event Queue** for asynchronous processing.
- This ensures that event delivery is ordered and can be managed independently of the publisher's execution flow.

### Step 5: Handler Invocation

- The **Event Queue** dispatches the event to each discovered **Handler**.
- Each handler's callback is invoked with the event data.
- This step may be performed asynchronously or synchronously, depending on the system's configuration.

### Step 6: Logging Handler Execution

- Each **Handler** logs its execution via **EventualityLogger**, recording the handler invocation and any relevant details.

### Step 7: Event Persistence (if no handlers)

- If no handlers were found for the event, **Eventuality** persists the event in the **Persisted Events Store** for the specified clusters.
- This allows future subscribers to receive the event when they register.

### Step 8: Removal of Persisted Events (if needed)

- If the event should not be persisted (according to the `persist` parameter or business rules), **Eventuality** removes any previously persisted copies of the event for the relevant clusters from the **Persisted Events Store**.

---

## 4. Pseudocode Summary

The following pseudocode summarizes the sequence:

```
function publish(event, clusters, persist):
    handlers = SubscriptionRegistry.findHandlers(event.type, clusters)
    EventualityLogger.logPublish(event, clusters, persist)
    EventQueue.enqueue(event, handlers)
    for handler in handlers:
        EventQueue.dispatch(event, handler)
        EventualityLogger.logHandler(handler, event)
    if handlers is empty:
        PersistedEventsStore.persist(event, clusters)
    else if not persist:
        PersistedEventsStore.remove(event, clusters)
```

---

## 5. Implementation Guidance

- Each component should be implemented as a distinct module or class, with clear interfaces.
- The sequence of interactions must be preserved to ensure correct event delivery, persistence, and logging.
- The logic for handler discovery, event queuing, and persistence should be encapsulated within the Eventuality bus.
- Logging should be performed at each significant step for traceability and debugging.
- The system should be extensible to support additional features (e.g., filtering, prioritization) without altering the core flow.

---

By following this description, you can reproduce a functionally identical sequence diagram
in any modeling tool, and implement the same event publication logic in any programming
language.
