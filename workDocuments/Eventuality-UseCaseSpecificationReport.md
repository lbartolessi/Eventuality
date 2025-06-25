# Eventuality – Use Case Specification Report

This document collects and specifies the main use cases of the Eventuality system, aligned with the flows, decisions, and entities documented in the files under the `documentation/` folder. Each use case is described to faithfully reflect the current logic and diagrams of the system.

---

## UC-001: Initialize Eventuality

**Primary Actor:** System or developer  
**Precondition:** The system must be available before any publish or subscribe operation.

**Main Flow:**

1. The system loads the Eventuality module.
2. The singleton instance of Eventuality is initialized.
3. Internal structures for handler registration and event persistence are prepared.

---

## UC-002: Register a Handler

**Primary Actor:** Subscriber  
**Main Flow:**

1. The subscriber calls `subscribe(eventType, handler, cluster)` on Eventuality.
2. The system checks if a handler with the same `eventType` and handler reference already exists:
    - If it exists, the associated cluster is updated.
    - If it does not exist, the new handler is registered.
3. The handler is now registered for future events.

---

## UC-003: Unregister a Handler

**Primary Actor:** Subscriber  
**Main Flow:**

1. The subscriber calls `unsubscribe(eventType, handler, cluster)` on Eventuality.
2. The system removes the handler from the registry for that `eventType` and cluster.
3. The handler will no longer receive events of that type and cluster.

---

## UC-004: Publish an Event

**Primary Actor:** Publisher  
**Main Flow:**

1. The publisher calls `publish(event, clusters, persist)` on Eventuality.
2. Eventuality filters registered handlers by `eventType` and by `cluster` (including wildcard logic).
3. If there are no matching handlers:
    - The event is persisted for the indicated clusters.
    - The flow ends.
4. If there are matching handlers:
    - A queue is created with the selected handlers.
    - For each handler in the queue:
        - The system decides whether to persist the event (according to the `persist` parameter, the default value, or if it is a `REQUEST_EVENT`).
        - If it is a `REQUEST_EVENT`, an automatic subscription to the target event is performed before executing the callback.
        - If the event should not be persisted and is not a `REQUEST_EVENT`, persisted copies of the event are removed for the indicated clusters.
        - The handler's callback is executed.
    - The flow ends when all handlers have been processed.

---

## UC-005: Subscribe to an Event Type

**Primary Actor:** Subscriber  
**Main Flow:**

1. The subscriber calls `subscribe(eventType, handler, cluster)` on Eventuality.
2. The system checks if a handler with the same `eventType` and handler reference already exists:
    - If it exists, the associated cluster is updated.
    - If it does not exist, the new handler is registered.
3. The system searches for persisted events matching the `eventType` and `cluster` (or wildcards).
4. If matching persisted events exist, they are delivered to the handler (invoking its callback).
5. The handler is now registered for future events.

---

## UC-006: Deliver Persisted Events on Subscription

**Primary Actor:** Subscriber  
**Main Flow:**

1. After registering or updating a handler, the system searches for persisted events matching the `eventType` and `cluster`.
2. If any exist, the handler's callback is invoked for each persisted event found.
3. The flow ends.

---

## UC-007: Request an Event (Request-Response Pattern)

**Primary Actor:** Publisher  
**Main Flow:**

1. The publisher calls `request(requestDetails, clustersToPublishRequestEvent)` on Eventuality.
2. The system extracts from the payload:
    - The target event to subscribe to (`targetEvent`)
    - The cluster to listen on (`cluster`)
    - The handler to receive the event (`handler`)
3. The system subscribes the handler to the target event and cluster **before** publishing the `REQUEST_EVENT`.
4. The system publishes the `REQUEST_EVENT` to the indicated clusters.
5. For each handler processing the `REQUEST_EVENT`:
    - The event is always persisted.
    - Before executing the callback, the automatic subscription to the target event is performed.
    - The handler's callback is executed.
6. The flow ends when all handlers have been processed.

---

## UC-008: Remove Persisted Events

**Primary Actor:** Publisher  
**Main Flow:**

1. When an event is published with `persist` set to `false` and it is not a `REQUEST_EVENT`, Eventuality removes persisted copies of the event for the indicated clusters.
2. The flow continues as in the normal publish case.

---

## UC-009: Handle Duplicate Subscription

**Primary Actor:** Subscriber  
**Main Flow:**

1. The subscriber calls `subscribe(eventType, handler, cluster)` on Eventuality.
2. The system detects that a handler with the same `eventType` and handler reference already exists.
3. The system updates the cluster associated with that handler and eventType.
4. The system searches for matching persisted events and delivers them to the handler if any exist.
5. The flow ends.

---

## Implementation Notes

- The persistence logic and automatic subscription for `REQUEST_EVENT` ensure the system is ready to receive the response before the handler processes the request.
- Removal of persisted events only occurs for non-persistent and non-`REQUEST_EVENT` events.
- The system is deterministic and can be implemented in any language or system that supports basic data structures and control flow.
- The flow and entity diagrams in the `documentation/` folder visually illustrate these use cases.

---

## References

- Eventuality-EventPublishingDataFlow.md
- Eventuality-EventSubscriptionDataFlow.md
- Eventuality-EventPublishingDataFlow.dot
- Eventuality-EventSubscriptionDataFlow.dot
- Eventuality-CoreEntity_RelationshipDiagram.dot
- Eventuality-EventSubscriptionDataFlow.md
- Eventuality-EventPublishingDataFlow.md

---

This report can be expanded with flow diagrams and concrete examples as needed for the project.
