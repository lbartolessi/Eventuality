# Eventuality – Detailed Event Publishing Data Flow (Verbal Description, Expanded)

This document provides a comprehensive, step-by-step, and pedagogical explanation of the event publishing logic as represented in the "Eventuality - Event Publishing Data Flow" diagram. The description is designed so that, by following this logic, you can reproduce a functionally identical diagram in any language or tool, and also implement the exact same algorithm in any programming language.

---

## 1. Entry Point: Publishing an Event

The process starts when a **Publisher** calls the `publish(event, clusters, persist)` method on the **Eventuality** system.

- `event`: The event object to be published.
- `clusters`: A list of cluster names (strings) indicating the intended target clusters for the event.
- `persist`: This parameter can be `true`, `false`, or `undefined`. If `undefined`, the system uses the value of `this.persistDefault` (which is always `true` or `false`).

---

## 2. Handler Selection Logic

**Eventuality** maintains a registry of handlers, each associated with a specific `eventType` and a `cluster` (which can be a specific name or the wildcard `'*'`).

To determine which handlers should process the event:

### a. Event Type Matching (First Step)

- First, select only those handlers where `handler.eventType == event.eventType`.

### b. Cluster Matching (Second Step)

- From the handlers selected above, further filter as follows:
  - If `event.clusters` contains the wildcard `'*'`, **all handlers from the previous step** are selected, regardless of their cluster.
  - Otherwise, a handler is selected if:
    - The handler's `cluster` is `'*'` (meaning it listens to all clusters), **or**
    - The handler's `cluster` is present in `event.clusters`.

The result is a list of **matching handlers** for this event.

---

## 3. Handler Count Decision

- **If the number of matching handlers is zero:**
  - The event is persisted (see persistence logic below).
  - The process ends for this event (no further action is taken).

- **If there is at least one matching handler:**
  - The system creates a queue with references to all selected handlers and enters a loop, processing each handler individually as described below.

---

## 4. Per-Handler Processing Loop

For each handler in the queue of matching handlers, the following steps are performed:

### a. Persistence Decision (Expanded)

- If the `persist` parameter is `true`, the event is persisted.
- If the `persist` parameter is `false`, the event is **not** persisted.
- If the `persist` parameter is `undefined`, the system checks `this.persistDefault`:
  - If `this.persistDefault` is `true`, the event is persisted.
  - If `this.persistDefault` is `false`, the event is **not** persisted.

### b. Special Event Type Decision

- If `event.eventType == 'REQUEST_EVENT'`, the event is **always persisted** (regardless of the `persist` flag or default).
- **Además, justo después de persistir el evento y antes de ejecutar el callback del handler, se realiza una suscripción automática**:
  - Se extraen del payload del evento los datos: `targetEvent`, `cluster`, y `handler`.
  - Se llama a `subscribe(targetEvent, handler, cluster)` para preparar la recepción del evento solicitado antes de ejecutar el callback.

### c. Remove Events (para eventos no persistentes)

- Si el evento no debe persistirse y no es un `REQUEST_EVENT`, se eliminan las copias persistidas para los clusters indicados, dejando intactas las de otros clusters.

### d. Handler Callback Execution

- El callback del handler es invocado, pasando el evento como argumento.

### e. Loop Continuation

- Tras procesar el handler actual, si quedan más en la cola, el bucle continúa; si no, el proceso termina.

---

## 5. End of Flow

- Una vez procesados todos los handlers (o si no había ninguno), el proceso de publicación del evento concluye.

---

## 6. Pseudocódigo Resumido

```pseudocode
function publish(event, clusters, persist):
    // 1. Filtrado por tipo y cluster
    type_handlers = [h for h in handlers if h.eventType == event.eventType]
    if '*' in clusters:
        matching_handlers = type_handlers
    else:
        matching_handlers = [h for h in type_handlers if h.cluster == '*' or h.cluster in clusters]

    // 2. Si no hay handlers, persistir y terminar
    if matching_handlers is empty:
        persist_event(event)
        return

    // 3. Procesar cada handler
    handler_queue = matching_handlers.copy()
    while handler_queue is not empty:
        handler = handler_queue.pop(0)
        should_persist = false
        if persist == true:
            should_persist = true
        else if persist == undefined:
            should_persist = this.persistDefault
        if event.eventType == 'REQUEST_EVENT':
            should_persist = true
        if should_persist:
            persist_event(event)
        if event.eventType == 'REQUEST_EVENT':
            // Extraer datos del payload
            targetEvent = event.data.targetEvent
            targetCluster = event.data.cluster
            targetHandler = event.data.handler
            subscribe(targetEvent, targetHandler, targetCluster)
        if not should_persist and event.eventType != 'REQUEST_EVENT':
            remove_persisted_event(event, clusters)
        handler.callback(event)
    // Fin
```

---

## 7. Implementation Notes

- La lógica de persistencia y suscripción automática para `REQUEST_EVENT` garantiza que el sistema esté preparado para recibir la respuesta antes de que el handler procese la solicitud.
- El borrado de eventos persistidos solo ocurre para eventos no persistentes y no-`REQUEST_EVENT`.
- El proceso es determinista y puede implementarse en cualquier lenguaje o sistema que soporte estructuras de datos y control de flujo básicos.

---

Siguiendo esta descripción, puedes reproducir el flujo de publicación de eventos en cualquier herramienta de diagramación o implementar la lógica en cualquier lenguaje de programación.
