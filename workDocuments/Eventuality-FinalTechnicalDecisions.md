# Eventuality – Final Technical Decisions and Rationale

This document consolidates all pending technical decisions for the Eventuality event bus system, providing clear, justified choices for each open question. It is intended to serve as the definitive reference for implementation and future maintenance.

---

## 1. Handler Asynchronous Execution Model

- **Decision:** The default will be `handlerAsyncMode: "individual"` (each handler is invoked in its own microtask for error isolation and parallel start). Optionally, users can set `handlerAsyncMode: "batch"` for sequential batch processing if desired.
- **Rationale:** Maximizes robustness and error isolation by default, but allows optimization for lightweight handlers.

## 2. Memory Management for Handlers

- **Decision:** The subscription registry will use strong references by default. Users must explicitly call `unsubscribe` to avoid memory leaks. Optionally, a future version may allow `WeakRef`-based storage for advanced use cases.
- **Rationale:** Strong references are predictable and compatible. Weak references add complexity and are not universally supported.

## 3. Event and Handler Validation

- **Decision:** TypeScript compile-time checking is the main guarantee. Minimal runtime validation will be performed for critical API entry points (e.g., presence of `eventType`, handler shape) to catch gross errors in JavaScript usage.
- **Rationale:** Balances developer experience and runtime safety.

## 4. Persistence Backend

- **Decision:** In-memory persistence is the only supported backend for now. The API and internal design will allow for future extension to pluggable storage.
- **Rationale:** Keeps the initial implementation simple and robust, but future-proofs the design.

## 5. Decorator Integration

- **Decision:** The `@eventMethod` decorator is recommended but not required. Any object conforming to the `EventHandler` interface (with a unique `id: symbol`) is accepted.
- **Rationale:** Maximizes flexibility and interoperability.

## 6. Dynamic Configuration

- **Decision:** Only `debugMode` and `waitTimeout` are dynamically configurable after initialization. All other options are fixed at instance creation.
- **Rationale:** Prevents unpredictable runtime changes while allowing essential debugging and timeout tuning.

## 7. Error Propagation and Callback Signature

- **Decision:** All errors from handlers are caught and passed to `EventualityOptions.handleError(error, event, handler)`. If not provided, errors are logged (if `debugMode`). No automatic retries are performed by default.
- **Rationale:** Ensures robust error isolation and gives users full control over error handling.

## 8. Wildcard Cluster (`'*'`) Handling

- **Decision:** The registry and persisted events store use a nested `Map` structure. Matching and filtering algorithms are as described in the technical documentation, ensuring O(1) access and correct delivery semantics for wildcard and specific clusters.
- **Rationale:** Efficient, scalable, and easy to reason about.

## 9. API Surface and Singleton Behavior

- **Decision:** Only documented methods and properties are public. Calling `getInstance` with new options after initialization logs a warning and ignores the new options (except for `debugMode` and `waitTimeout`).
- **Rationale:** Prevents accidental reconfiguration and maintains singleton integrity.

## 10. Resetting State

- **Decision:** `_resetInstance()` clears all internal state (subscriptions, persisted events, event queue, processing flags) to guarantee a clean state for testing.
- **Rationale:** Ensures reliable, repeatable tests and safe reinitialization.

## 11. Logging Requirements

- **Decision:** `EventualityLogger` covers all significant lifecycle events, including handler execution, persisted event delivery, API errors, and configuration warnings. Logging is controlled by `debugMode`.
- **Rationale:** Provides full traceability for debugging and auditing.

## 12. Testing and Coverage

- **Decision:** All core flows (publish, subscribe, unsubscribe, request, error handling, persistence, wildcard logic) must be covered by unit and integration tests. Minimum 90% code coverage is recommended.
- **Rationale:** Ensures reliability and maintainability.

---

These decisions are now considered definitive for the Eventuality system. Any future changes should be justified and documented in an updated version of this file.
