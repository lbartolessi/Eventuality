# Missing Information and Pending Decisions for Eventuality Implementation

This document summarizes the remaining open questions and decisions required to ensure a robust, predictable, and maintainable implementation of the Eventuality event bus system. It is intended as a checklist and discussion base for the development team.

---

## 1. Open Questions / Missing Information

- **Edge Cases and Error Handling:** Are all edge cases (e.g., duplicate subscriptions with different options, malformed events, handler errors) fully specified? Should the system fail fast or be tolerant in ambiguous cases?
- **Event and Handler Validation:** Should there be runtime validation of event and handler structure, or is TypeScript compile-time checking sufficient?
- **Persistence Backend:** Is in-memory persistence sufficient, or should the API be designed to allow for pluggable external storage (e.g., database, file, IndexedDB)?
- **Concurrency Model:** Is single-threaded operation assumed, or should the system be safe for concurrent access (e.g., in web workers or multi-threaded environments)?
- **Automatic Cleanup of Persisted Events:** Should there be a built-in TTL or auto-cleanup for old persisted events, or is manual cleanup by publishers sufficient?
- **Decorator Integration:** Is the use of the `@eventMethod` decorator required, recommended, or optional for handler registration? Should Eventuality accept any object conforming to the `EventHandler` interface?
- **Dynamic Configuration:** Which options (besides `debugMode` and `waitTimeout`) can be changed at runtime? Should configuration changes be global or per-instance?
- **Strong vs. Weak References for Handlers:** Should the subscription registry use strong references (requiring explicit `unsubscribe`) or weak references (allowing GC to clean up unused handlers)?
- **Error Propagation:** Should errors thrown by handlers be propagated, logged, or passed to a user-provided callback? Should there be a retry mechanism?
- **Environment Compatibility:** Is the implementation expected to work identically in Node.js, browsers, and other JS environments? Are there any environment-specific constraints?
- **Testing and Coverage:** What is the minimum acceptable test coverage? Are there specific scenarios that must be covered by tests?

---

## 2. Pending Decisions

- **Handler Async Execution Model:** Should handler invocation be individually wrapped in microtasks (for error isolation and parallel start), or processed in a batch per event? Should this be configurable?
- **Wildcard Cluster (`'*'`) Handling:** Confirm the algorithms and data structures for efficiently matching events and handlers when `'*'` is used in publishing or subscribing, and for filtering persisted events.
- **Memory Management for Handlers:** Decide between strong and weak references for handler storage. Document the pros and cons of each approach and the implications for memory leaks and lifecycle management.
- **Error Handling Callback Signature:** Should the error handler receive just the error and event, or also the handler and additional context?
- **API Surface:** Which methods and properties should be public/documented, and which should remain internal?
- **Default Persist Logic:** Clarify the precedence and interaction between the `defaultPersist` option and the `persist` parameter in `publish`.
- **Singleton Behavior:** Should calling `getInstance` with new options after initialization have any effect? Should this be a warning or an error?
- **Resetting State:** What exactly should `_resetInstance()` clear? Should it guarantee a fully clean state for testing?
- **Logging Requirements:** What level of detail and coverage is required for `EventualityLogger`? Should all lifecycle events be logged?

---

This list should be reviewed and resolved by the project owner or team before finalizing the implementation to avoid ambiguities and ensure the system meets all requirements and expectations.
