# Requirements Document: Eventuality System

## 1. Introduction

### 1.1 Purpose

Define the requirements for the "Eventuality" module (`src/Eventuality.ts`), a modular and typed Event Bus for web applications, especially for efficient communication between Web Components. It operates as a Singleton and supports publish-subscribe, asynchronous processing, event persistence, clusters, and debugging.

### 1.2 Scope

This document covers the functional and non-functional requirements of the Eventuality system:

- Definition and typing of events.
- Publishing and subscribing to events (with clusters and data flow control).
- Event persistence.
- Asynchronous processing and error handling.
- Debug mode.
- Singleton instance management.
- Adherence to the defined `EventualityInterface`.

## 2. Glossary

| Término/Acrónimo    | Definición                                            |
|--------------------|-------------------------------------------------------|
| Evento             | Objeto `BaseEvent<D>` con `eventType` y `data`.       |
| Manejador          | Función `EventHandler<D>` que procesa eventos.        |
| Publicador         | Componente que emite eventos.                         |
| Suscriptor         | Componente que registra un manejador para un evento.  |
| Clúster            | Identificador de agrupación para entrega de eventos.  |
| Evento Persistido  | Evento almacenado para nuevos suscriptores.           |
| `REQUEST_EVENT`    | Tipo especial de evento para patrones request-response.|
| Singleton          | Patrón de instancia única.                            |
| API                | Application Programming Interface.                    |
| FR                 | Functional Requirement.                               |
| NFR                | Non-Functional Requirement.                           |

## 3. Specific Requirements

### 3.1 Functional Requirements

The system MUST:

- **FR1.1 (Singleton Access):** Expose a static `getInstance` method to obtain the Singleton instance.
  - **FR1.1.1:** If `getInstance` is called with options when an instance already exists, a warning MUST be logged, and the provided options (except for dynamically configurable ones like `debugMode` and `waitTimeout`) MUST be ignored.
- **FR1.2 (Event Publishing):** Allow publishing events to one or more clusters, with a persistence option.
  - **FR1.2.1:** The `publish` method's optional `persist?: boolean` parameter, if provided, MUST override the `EventualityOptions.defaultPersist` setting. If the `persist` parameter is not provided, `EventualityOptions.defaultPersist` MUST be used.
- **FR1.3 (Subscription Management):** Allow subscribing and unsubscribing handlers to events and clusters.
- **FR1.4 (Request-Response):** Support a `request` method for request-response patterns.
  - **FR1.4.1:** The `request` method signature MUST be: `request<T extends BaseEvent<D>, D>(requestDetails: { targetEvent: T; handler: EventHandler<D>; cluster: string; }, clustersToPublishRequestEvent: Set<string>): void;`. The `requestDetails.targetEvent` represents the event being awaited by the requester.
- **FR1.5 (Asynchronous Delivery):** Deliver events asynchronously and not block the UI.
  - **FR1.5.1:** The asynchronous processing model for invoking a batch of handlers for a given event MUST be configurable via an option (e.g., `handlerAsyncMode: "individual" | "batch"` in `EventualityOptions`), allowing choice between full error isolation with parallel start (`individual`) or minimal event loop overhead with sequential batch processing (`batch`).
- **FR1.6 (Debug Mode):** Support a configurable debug mode.
  - **FR1.6.1:** The `EventualityLogger` MUST cover all significant lifecycle events and operations, including explicit logs for when persisted events are delivered to a new subscriber.
- **FR1.7 (Error Handling):** Handle errors in handlers and pass them to a configurable callback.
  - **FR1.7.1:** The `EventualityOptions.handleError` callback signature MUST be: `handleError?: (error: Error, event: BaseEvent<any>, handler?: EventHandler<any>) => void;`, providing the event and the specific handler (if applicable) that caused the error.

### 3.2 Non-Functional Requirements

The system MUST:

- **NFR1.1 (Efficiency & Scalability):** Be efficient and scalable for many events and subscribers.
- **NFR1.2 (Robustness & Memory Safety):** Be robust against errors and avoid memory leaks.
  - **NFR1.2.1:** The Subscription Registry WILL use strong references to `EventHandler` instances. It is the user's responsibility to call `unsubscribe` when a handler is no longer needed to prevent memory leaks.
- **NFR1.3 (API Clarity):** The API MUST be clear, documented, and easy to use.
- **NFR1.4 (Modularity & Maintainability):** The code MUST be modular and maintainable.
  - **NFR1.4.1:** `EventualityError` (a custom error class) MUST be used for critical errors specific to the Eventuality bus logic (e.g., invalid handler registration, issues in request-response pattern). Standard JavaScript errors (e.g., `TypeError`) MAY be used for general programming errors.
- **NFR1.5 (Testability):** Be highly testable.
  - **NFR1.5.1:** The `_resetInstance()` method MUST fully clear all internal state of the Eventuality instance (subscription registry, persisted events store, event queue, processing flags, etc.) to ensure a clean state for testing.
  - **NFR1.5.2:** A comprehensive testing strategy MUST be defined and implemented, covering unit, integration, and end-to-end tests, including all edge cases and error conditions.

### 3.3 Specific Requirements Details and Decisions

The following details and decisions clarify specific aspects of the Eventuality system:

- **Typing and Validation:** The system is designed for TypeScript, so the typing of events and handlers is validated at compile time. Runtime validation is not performed unless a specific JavaScript interface is implemented in the future.
- **Event Persistence:** Persistence is in-memory in this version. The possibility of implementing adapters for external storage (disk, database) is left open for the future.
- **Error Handling in Handlers:** Errors thrown by handlers MUST be caught and sent to an error handling callback if one has been configured (see FR1.7.1).
- **Dynamic Configuration:** The `debugMode` and `waitTimeout` options can be changed dynamically after initialization. Other options are not modifiable once the instance is created.
- **Debug Mode Activation:** Activated via the `debugMode` option in the Eventuality configuration.
- **Decorators (`@eventMethod`):** The `@eventMethod` decorator is used in components wishing to subscribe to events but is not used internally by Eventuality. Eventuality receives a fully formed `EventHandler`, regardless of how it was obtained or decorated.
- **Handler Identity and Registration:**
  - The `EventHandler<D>` interface, which includes a mandatory `id: symbol` property, is the primary way to register handlers. The `id` (Symbol) is used for uniqueness in the subscription registry and for `unsubscribe` operations.
  - While the `@eventMethod` decorator is a convenient way to create `EventHandler` instances (and generates the `id`), handlers can be created manually as long as they conform to the `EventHandler` interface.
  - A specific `EventHandler` instance (identified by its `id`) can only be subscribed once. If `subscribe` is called again with the same `EventHandler` instance and the same `eventType` but a different `cluster`, the handler's registered cluster is updated. If the `cluster` is also the same, no action is taken.
  - Each `EventHandler` instance is inherently designed to handle a specific `eventType`. Attempting to register the same `EventHandler` instance for a *different* `eventType` MUST result in a critical error.
- **Subscription Registry Structure:**
  - Conceptually, the subscription registry can be thought of as `Map<eventType: string, Map<cluster: string, Map<handlerId: symbol, EventHandler<any>>>>`.
  - Each subscription record (implicitly linking an `EventHandler` to an `EventType` and a `Cluster`) is unique by `handlerId`.
- **Wildcard Cluster (`'*'`) Logic:**
  - **Handler Matching:** When an event is published:
    - If published to one or more specific clusters: Handlers registered for those specific clusters AND handlers registered for the wildcard cluster (`'*'`) for that `eventType` are matched.
    - If published to the wildcard cluster (`'*'`): All handlers registered for that `eventType` (regardless of their specific cluster or if they are registered to `'*'`) are matched.
  - **Persisted Event Filtering:** When a handler subscribes:
    - If subscribing to the wildcard cluster (`'*'`): All persisted events of that `eventType` are delivered, regardless of the cluster they were originally published to.
    - If subscribing to a specific cluster: Persisted events for that specific cluster AND persisted events originally published to the wildcard cluster (`'*'`) for that `eventType` are delivered.
- **Concurrency Management (Single-Threaded):** The system assumes single-threaded execution. Critical sections modifying internal state (registries, queue) MUST be reviewed to ensure proper sequencing and atomicity against concurrently scheduled microtasks or macrotasks originating from Eventuality's own asynchronous operations.
- **Event Cleaning Policy:** The cleaning of persisted events is manual by publishers (by publishing with `persist: false`). An automatic policy may be implemented later.
- **Public and Private API:** All relevant interfaces and types are public. Internal methods MUST be private. All public and private APIs MUST be exhaustively documented.
- **Compatibility:** The system is intended to work in standard TypeScript environments. Compatibility with Node.js or pure browser environments without adaptations is not guaranteed.

## 4. Referencias

- `Eventuality-SoftwareArchitectureDocument.md` para arquitectura.
- Diagramas y flujos: ver archivos `.md`, `.dot`, `.plantuml` y `diagrams.md` en `documentation/`.
- Para detalles de implementación, ver `src/Eventuality.ts` y comentarios TSDoc.

## 4. References

- `Eventuality-SoftwareArchitectureDocument.md` for architecture.
- Diagrams and flows: see `.md`, `.dot`, `.plantuml`, and `diagrams.md` files in `documentation/`.
- For implementation details, see `src/Eventuality.ts` and TSDoc comments.

## 11. References

- See `Eventuality-FinalTechnicalDecisions.md` for a consolidated and justified list of all technical decisions and rationale adopted for the implementation of Eventuality. This file is the definitive reference for any ambiguity or future maintenance.

---

*End of Requirements Document*
