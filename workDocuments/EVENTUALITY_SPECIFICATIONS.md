# Eventuality Implementation Prompt

## 1. Overview

**Eventuality** is a modular, fully-typed Event Bus framework for dashboard and map-based web applications. It is designed to manage communication between Web Components efficiently, ensuring decoupling, type safety, and non-blocking UI updates. The system supports asynchronous event processing, cluster-based subscriptions, event persistence, and debugging features. The architecture is extensible and suitable for complex, interactive UIs.

## 2. Typed Event Definition

- All events must extend from a `BaseEvent<T>`, which includes both the event type and its associated data in a single object. This ensures compile-time type safety and decoupling between components.
- The event type (`eventType`) and the data structure (`data`) are always coupled. This guarantees that all events of the same type have the same structure, enforced by TypeScript.
- The event bus itself does not validate event types or data; it assumes all input is valid and relies on TypeScript for compile-time safety.
- Events not are dynamically created or modified. They are defined statically in the codebase, ensuring that all events are known at compile time.
- The event type is a string, and the data is a generic object. The event type should be unique within the application context to avoid collisions.

```typescript
export interface BaseEvent<T> {
  eventType: string; // Unique identifier for the event type
  data: T; // Data associated with the event
}
```

## 3. Event Handler Interface

- Event handlers are functions with additional metadata for debugging and tracking:

```typescript
export interface EventHandler<T> {
  (event: BaseEvent<T>): void;
  id: symbol; // Unique identifier for the handler instance
  className?: string; // Name of the class or component
  tagName?: string; // Custom element tag name, if applicable
}
```

- `id`: symbol garantiza que cada instancia de EventHandler tiene un identificador único.
- Handlers should be idempotent and not assume synchronous execution.

## 4. Cluster-Based Publishing and Subscription

- Clusters are alphanumeric strings or `*` (global context). No validation is needed in
  the bus event; clusters are assumed to be pre-validated by the component.
- Components can subscribe to one or more clusters. Events are delivered to all subscribers whose cluster list contains at least one of the clusters specified in the publication.
- The `*` cluster is a wildcard; it is just another identifier, but is used for global
  context. It can't be combined with other clusters in a `Set`, But if it were, it would be as if it were the only cluster.
- When a Component publishes an event with the cluster == "*", it will be delivered to all subscribers of that event, regardless of the clusters listed in the subscription.
- When a Component subscribes to an event with the cluster == "*", it will receive all publications of that event, regardless of the clusters listed in the publication.
- Any falsy value for clusters (empty string, null, undefined) is treated as `*`.
- The `publish`, `subscribe`, and `unsubscribe` methods all accept cluster `Set`.
- Subscriptions are tracked per event type and per cluster. A single callback can be subscribed to multiple clusters for the same event type.
- When publishing, the event is delivered to all handlers subscribed to any of the specified clusters.
- When subscribing, if a persisted event exists for the cluster, the callback is immediately invoked with the last value.
- When unsubscribing, the callback is removed from all clusters for the event type.

## 5. Asynchronous Event Processing

- All event processing is asynchronous to avoid blocking the UI. Each event is processed using `await new Promise(resolve => setTimeout(resolve, 0))` before invoking the handler, ensuring the main thread is released and event order is preserved.
- Events are queued and processed sequentially to maintain emission order. The queue should be implemented as a FIFO structure.
- If multiple events are published in rapid succession, they are processed in the order received.
- If a handler throws an error, it is caught and passed to the `handleError` callback.

## 6. Event Persistence

- The `persist` parameter in `publish` determines if the last event value is saved per event type and cluster.
- If `persist` is true, the last event is stored and delivered to new subscribers immediately upon subscription (per event type and cluster).
- If `persist` is false, the event is not stored and is only delivered to current subscribers. Any previous persisted value for those clusters is removed.
- If `persist` is not specified, a default value from the constructor is used.
- Persistence is implemented as a map of event type and cluster to the last event value.
- When a new subscription is added, if a persisted event exists for the cluster, the callback is invoked asynchronously with the last value.
- If we publish an event with `persist` set to false, any previously persisted event for those clusters are removed.
- The system should handle edge cases where a subscription is added after an event is published, ensuring the last value is delivered correctly.
- The system should also handle cases where multiple subscriptions exist for the same event type and cluster, ensuring all handlers receive the event in the correct order.
- The system should ensure that the persisted event is cleared when `persist` is set to false, and that the last value is not delivered to new subscribers in this case.

## 7. API: EventualityInterface

La interfaz del bus de eventos debe implementarse exactamente como sigue, asegurando la correspondencia de tipos y documentación:

```typescript
import { BaseEvent, EventHandler } from "./eventTypes.js";

/**
 * Interface for the Eventuality event bus.
 */
export interface EventualityInterface {
    /**
     * Publishes an event to the specified clusters.
     * @param event The event type to publish.
     * @param clusters A set of cluster IDs to publish the event to.
     * @param persist If true, the event is persisted for new subscribers. If not specified, uses the default from the constructor.
     */
    publish<T extends BaseEvent<D>, D>(
        event: T,
        clusters?: Set<string>,
        persist?: boolean
    ): void;

    /**
     * Subscribes a handler to the specified clusters for a given event type.
     * @param event The event type to subscribe to.
     * @param handler The event handler function.
     * @param clusters A set of cluster IDs to subscribe to.
     */
    subscribe<T extends BaseEvent<D>, D>(
        event: T,
        handler: EventHandler<D>,
        clusters?: Set<string>
    ): void;

    /**
     * Unsubscribes a handler from all clusters for a given event type.
     * @param event The event type to unsubscribe from.
     * @param handler The event handler function.
     */
    unsubscribe<T extends BaseEvent<D>, D>(
        event: T,
        handler: EventHandler<D>
    ): void;
}
```

- Todos los métodos deben documentarse con TSDoc, incluyendo parámetros, valores de retorno y efectos secundarios.
- Los métodos `publish`, `subscribe` y `unsubscribe` aceptan un conjunto (`Set<string>`) de clusters, nunca un string simple.
- El parámetro `persist` en `publish` es opcional y, si no se especifica, se usa el valor por defecto del constructor.
- El tipo de evento debe ser una extensión de `BaseEvent<D>`, y los handlers deben ser del tipo `EventHandler<D>`.
- La implementación debe seguir exactamente esta firma para garantizar la compatibilidad y la seguridad de tipos en todo el sistema.

## 8. Debug Mode

- When `debugMode` is enabled in the constructor, the system logs all publications and processed subscriptions with emojis and metadata (event name, cluster, class, tag):
  - 📢 for publications
  - 👂️ for processed subscriptions (when a subscription is processed, not when registered)
  - ⌚️ for subscriptions processed immediately with persisted events
- Log format: emoji, event name, `[cluster]`, `{className}`, `<tagName>` (if available)
- Debug mode should not impact performance or memory usage in production.
- Debug logs should be clear, concise, and provide enough context to trace event flow.

## 9. Error Handling

- The constructor accepts a `handleError` callback for error management. If the error is not an instance of `Error`, it must be wrapped in one.
- All errors in event processing are passed to this handler with the event as context.
- If no `handleError` is provided, errors should be logged to the console by default.
- Error handling should not interrupt the event queue or prevent other events from being processed.

## 10. Testing

- Unit tests (Vitest) must cover:
  - Event emission and subscription logic, including edge cases (e.g., subscribing after an event is published, unsubscribing during event processing).
  - Cluster logic (simple and complex, including multiple clusters and the `*` cluster).
  - Event persistence (per event type and cluster, including overwriting and clearing
    persisted events).
  - Debug mode logging.
  - Error handling (ensuring errors are caught and passed to the handler, and do not break the queue).
- Tests must ensure that:
  - Subscriptions receive events only for matching clusters.
  - Persisted events are delivered to new subscribers immediately.
  - Unsubscribed callbacks are not called.
  - Debug logs work as specified.
  - The event queue maintains order and does not block the UI.

## 11. Implementation Notes

- The event bus must be modular and extensible. You may create auxiliary classes, directories, or files as needed.
- All methods must be documented with TSDoc, including parameters, return values, and side effects.
- The event bus itself does not validate clusters or event types; it assumes all input is valid.
- The system is designed for browser environments, but should not break in Node.js/test environments.
- The implementation should be optimized for performance and memory usage, especially in large applications with many events and subscribers.
- Consider using WeakMaps or similar structures to avoid memory leaks from lingering subscriptions.
- The codebase should follow best practices for TypeScript, including strict type checking and clear separation of concerns.

## 12. Singleton Pattern Requirement

- The Eventuality event bus **must be implemented as a Singleton**. Only one instance should exist per application context.
- The implementation must provide a static `getInstance()` method to retrieve the single instance.
- The constructor must be private or protected to prevent direct instantiation from outside the class.
- **All usage examples, documentation, and tests must use the Singleton instance via `Eventuality.getInstance()`.**

```typescript
    public static getInstance(options?: EventualityOptions): Eventuality {
        if (!Eventuality.instance) {
            Eventuality.instance = new Eventuality(options);
        }
        return Eventuality.instance;
    }
```

- The `getInstance` method, when it is already instanced, simply ignores the options parameter. The options are set only on the first call to `getInstance()`. Subsequent calls to `getInstance()` will ignore the options parameter.

- The options object can be frozen for greater encapsulation. But there has to be a public method:

```typescript
  /**
   * Returns the current debug mode status.
   * @returns {boolean} True if debug mode is enabled, false otherwise.
   */
  isDebugMode():boolean {
    return this.debugMode;
  }
```

- Do **not** use `new Eventuality()` anywhere in the codebase, documentation, or tests.
- This ensures global event coordination and prevents bugs from multiple, isolated event buses.

## 12.1. Modificaciones al comportamiento del Singleton en modo debug

- El método `getInstance(options)` debe emitir una advertencia en consola (console.warn) si se pasan opciones y la instancia Singleton ya existe. El mensaje debe indicar que las opciones han sido ignoradas y sugerir el uso de `_resetInstance()` para aislamiento en tests.
- El método estático `_resetInstance()` debe limpiar completamente el estado interno del Singleton (subscripciones, eventos persistidos, cola de eventos, flags internos) y poner la instancia a null, permitiendo que la siguiente llamada a `getInstance()` reciba nuevas opciones.
- El método `isDebugMode()` debe reflejar el valor actual de debug tras un reset y nueva inicialización.
- Documentar este comportamiento en el código y en la documentación pública del API.

## 13. Tests de especificaciones

- Debe existir un archivo de tests de especificaciones (por ejemplo, `test/eventuality.specs.test.ts`) que cubra exhaustivamente todos los requisitos de este documento, incluyendo:
  - Emisión y suscripción de eventos, incluyendo casos límite (subscribirse después de publicar, desuscribirse durante el procesamiento, etc).
  - Lógica de clusters (simples, múltiples, y el cluster `*`).
  - Persistencia de eventos (por tipo y cluster, sobrescritura y limpieza de eventos persistidos).
  - Modo debug (verificar logs y formato de los mismos).
  - Manejo de errores (asegurar que los errores se capturan y pasan al handler, y no interrumpen la cola).
  - Comportamiento Singleton: asegurar que las opciones solo afectan a la primera inicialización y que `_resetInstance()` permite reconfiguración.
- Los tests deben usar siempre `Eventuality.getInstance()` y nunca `new Eventuality()`.
- Los tests deben llamar a `_resetInstance()` antes de cada test para garantizar aislamiento.
- Los tests deben verificar que los logs de debug y advertencias de Singleton se emiten correctamente cuando corresponde.

## 14. Cambios en dependencias y configuración

- Cualquier cambio en dependencias (por ejemplo, instalación de nuevas versiones de Jest, ESLint, o utilidades de test) o en archivos de configuración (`package.json`, `tsconfig.json`, `jest.config.cjs`, `eslint.config.cjs`) desde la creación del proyecto debe ser documentado en el archivo `ISSUES.md` y reflejado en este documento.
- Si se agregan, eliminan o actualizan dependencias, debe indicarse el motivo y la versión.
- Si se modifica la configuración de Jest, TypeScript o ESLint para soportar nuevas funcionalidades, debe documentarse el cambio y su justificación.
- El proyecto debe mantenerse alineado con las mejores prácticas de configuración y documentación para TypeScript y testing moderno.

---

This prompt summarizes and organizes all requirements and design notes from the original
specifications and code comments, eliminating redundancy and ambiguity. Use it as the
authoritative guide for implementing the Eventuality event bus project.
