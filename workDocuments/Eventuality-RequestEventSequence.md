# Eventuality – Sequence Diagram: Request-Response Pattern (Verbal Description)

This document provides a detailed, step-by-step, and pedagogical explanation of the logic and structure represented in the "Request-Response Pattern" sequence diagram (`Eventuality-RequestEventSequence.dot`). By following this description, you can reproduce a functionally identical diagram in any language or tool, and also implement the same logic and algorithm in any programming language.

---

## 1. Overview

This sequence describes how the Eventuality system handles a **request-response pattern** using special request events. The process ensures that when a publisher issues a request, the system automatically subscribes the response handler, persists the request event, dispatches it to the appropriate handler(s), and finally delivers the response back to the original requester.

---

## 2. Actors and Components

- **Publisher:** The external entity that initiates a request for a response event.
- **Eventuality (Bus):** The central orchestrator that manages the request, automatic subscription, event persistence, and response delivery.
- **Subscription Registry:** Internal storage that keeps track of all registered handlers, organized by event type and cluster.
- **Handler:** The callback function or object that processes the request event and publishes a response.
- **Persisted Events Store:** Internal storage for events that have been persisted for later delivery.

---

## 3. Step-by-Step Logic

### Step 1: Publisher Initiates a Request

- The **Publisher** calls the `request(requestDetails, clustersToPublishRequestEvent)` method on the **Eventuality** bus.
- `requestDetails` is an object: `{ targetEvent: BaseEvent<D>, handler: EventHandler<D>, cluster: string }`.
  - `targetEvent`: The actual event (including its `eventType`) that the publisher is waiting for as a response.
  - `handler`: The `EventHandler` instance that will process the `targetEvent` when it's published.
  - `cluster`: The cluster on which the `handler` should listen for the `targetEvent`.

### Step 2: Automatic Subscription to the Target Event

- **Eventuality** automatically subscribes the `requestDetails.handler` to the `requestDetails.targetEvent.eventType` on the `requestDetails.cluster`. This subscription is made **before** the `REQUEST_EVENT` itself is published.
- This ensures that the system is ready to receive the response as soon as it is published.

### Step 3: Persist the Request Event

- **Eventuality** creates and persists a special `REQUEST_EVENT` in the **Persisted Events Store** for the `clustersToPublishRequestEvent`. The payload of this `REQUEST_EVENT` contains the `requestDetails`.
- This guarantees that the request is not lost and can be processed even if handlers are registered later.

### Step 4: Dispatch the Request Event

- **Eventuality** dispatches this `REQUEST_EVENT` (containing `requestDetails` in its payload) to appropriate handlers subscribed to `'REQUEST_EVENT'` on the `clustersToPublishRequestEvent`.
- Each handler processing the `REQUEST_EVENT` is expected to eventually trigger the publication of an event that matches `requestDetails.targetEvent.eventType`.

### Step 5: Handler Publishes the Response

- The **Handler** that processes the request event publishes the corresponding response event back to the bus.

### Step 6: Deliver the Response to the Original Handler

- When an event matching `requestDetails.targetEvent.eventType` is published on a cluster matching `requestDetails.cluster`, **Eventuality** delivers this response event to the `requestDetails.handler` (which was subscribed in Step 2).
- This completes the request-response cycle.

---

## 4. Pseudocode Summary

The following pseudocode summarizes the sequence:

```
function request(requestDetails, clusters):
    // Step 2: Auto-subscribe response handler
    subscribe(requestDetails.targetEvent.type, requestDetails.handler, requestDetails.cluster)
    // Step 3: Persist the REQUEST_EVENT
    PersistedEventsStore.persist(REQUEST_EVENT, clusters)
    // Step 4: Dispatch REQUEST_EVENT to handler(s)
    for handler in SubscriptionRegistry.findHandlers('REQUEST_EVENT', clusters):
        handler(REQUEST_EVENT)
        // Step 5: Handler publishes response event
        // (Handler logic: publish(responseEvent, ...))
    // Step 6: Response is delivered to original handler via normal publish/subscribe flow
```

---

## 5. Implementation Guidance

- The system must ensure that the response handler is subscribed **before** the request event is published.
- Persisting the request event guarantees reliability, especially in asynchronous or distributed environments.
- The handler(s) that process the request event are responsible for publishing the corresponding response event.
- The original handler receives the response through the standard event delivery mechanism.
- This pattern enables robust, decoupled request-response interactions in event-driven systems.

---

By following this description, you can reproduce a functionally identical sequence diagram
in any modeling tool, and implement the same request-response logic in any programming
language.
