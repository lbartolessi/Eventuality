# Glossary of Terms for Eventuality Project

| Term/Acronym        | Definition                                                                 |
|---------------------|---------------------------------------------------------------------------|
| Event               | An object representing a specific occurrence, typically containing an `eventType` and associated `data`. **Example**: `{ eventType: 'USER_REGISTERED', data: { userId: 1 } }` |
| Handler             | A function that processes events, defined by the `EventHandler<D>` interface. **Example**: `Object.assign((e) => console.log(e.data), { id: Symbol('h'), className: 'UserComponent' })` |
| Publisher           | A component that emits events to the event bus.                          |
| Subscriber          | A component that registers a handler for a specific event type to receive notifications. |
| Cluster             | An identifier used for grouping events for targeted delivery to specific subscribers. **Example**: `'main'`, `'clusterA'` |
| Persisted Event     | An event that has been stored for later retrieval by new subscribers. **Example**: `bus.publish(event, new Set(['main']), true); // Later: bus.subscribe(event, handler, 'main');` |
| REQUEST_EVENT       | A special type of event used in request-response patterns. **Example**: `{ eventType: 'REQUEST_EVENT', data: { targetEvent: event, handler, cluster: 'main' } }` |
| Singleton           | A design pattern that restricts the instantiation of a class to a single instance. **Example**: `const bus1 = Eventuality.getInstance(); const bus2 = Eventuality.getInstance(); bus1 === bus2; // true` |
| API                 | Application Programming Interface, defining how different software components interact. |
| FR                  | Functional Requirement, specifying what the system should do.            |
| NFR                 | Non-Functional Requirement, specifying how the system performs its functions. |
| Eventuality         | The name of the event bus system designed for decoupled communication in applications. |
| EventualityInterface| The public API contract that defines the methods and properties exposed by the Eventuality singleton. |
| EventualityOptions  | Configuration options passed during the initialization of the Eventuality instance. |
| EventQueue          | A data structure that manages events awaiting processing in a FIFO manner. |
| Subscription Registry| A registry that manages active subscriptions and their associated handlers. |
| EventualityLogger   | A utility for logging debug information related to event processing.      |
| @eventMethod        | A decorator that transforms class methods into event handler instances.  |
