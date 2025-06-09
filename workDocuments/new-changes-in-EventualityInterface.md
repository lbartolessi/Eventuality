# New changes in EventualityInterface.ts

## Estructura del módulo

- A partir de ahora el nombre del archivo es `Eventuality.ts`.
- Forma un módulo que contiene los tipos base esenciales para `Eventuality`, públicos y exportados:
  
```typescript
/**
 * Base interface for all events.
 * @template T The type of the event data.
 */
export interface BaseEvent<T> {
  eventType: string;
  data: T;
}

/**
 * Event handler interface for Eventuality.
 * @template T The type of the event data.
 */
export interface EventHandler<T> {
  /**
   * Handles an event.
   * @param event The event to handle.
   */
  (event: BaseEvent<T>): void;
  /** Unique identifier for the handler instance. */
  id: symbol;
  /** Name of the class or component. */
  className: string;
  /** Custom element tag name, if applicable. */
  tagName?: string;
}

/**
 * Interface for requesting an event with a specific handler.
 * @template T The type of the event being requested.
 * @template D The type of data associated with the event.
 */
export interface RequestEventData<T extends BaseEvent<D>, D> {
  /** The type of event being requested. */
  targetEvent: T;
  /** The handler function to process the event. */
  handler: EventHandler<D>;
  /** The cluster where the event is being requested. */
  cluster: string;
  /** If the payload is passed by reference (true) or by value (false)
   * to the handler. Default is `false` */
  isReference?: boolean;
}

/**
 * Interface for a request event that includes a handler.
 * @template T The type of the event being requested.
 * @template D The type of data associated with the event.
 */
export interface RequestEvent<T extends BaseEvent<D>, D> {
  eventType: 'REQUEST_EVENT';
  data: RequestEventData<T, D>;
}

/**
 * EventualityInterface defines the contract for the Eventuality event bus. 
 * It provides methods to publish, subscribe, unsubscribe and request from events.
 */

/**
 * Interface for the Eventuality event bus. Provides methods to publish, subscribe,
 * unsubscribe and request from events.
 * @template T The type of the event being published or subscribed to.
 * @template D The type of data associated with the event.
 */
export default interface EventualityInterface {
...
```

- Contiene el interfaz `EventualityInterface` exportado como default.
- Contiene la clase `Eventuality` sin exportar, todas las interacciones se hacen a través
  del interfaz. Incluso `Eventuality.getInstace()` debe devolver `EventualityInterface`.
- Contiene la clase `EventualityError` sin exportar, que extiende de `Error`.

## Paso de parametros

- El paso de parámetros a los handlers se hace por valor, cómo ya se ha descrito, a menos que se especifique lo contrario
  en la llamada al método `subscribe` o en el `RequestEventData` con `isReference: true`.

```typescript
/**
 * Subscribes to an event with a specific handler.
 * @param eventType The type of event to subscribe to.
 * @param handler The handler function to process the event.
 * @param isReference If true, the payload is passed by reference; otherwise, by value.
 */
subscribe<T extends BaseEvent<D>, D>(
  eventType: string,
  handler: EventHandler<D>,
  isReference: boolean = false
): void {
  // Implementation here...
}
/**
 * Requests an event with a specific handler.
 * @param requestEvent The event to request.
 * @param handler The handler function to process the event.
 * @param cluster The cluster where the event is being requested.
 * @param isReference If true, the payload is passed by reference; otherwise, by value.
 */
request<T extends BaseEvent<D>, D>(
  requestEvent: RequestEvent<T, D>,
  handler: EventHandler<D>,
  cluster: string,
  isReference: boolean
): void {
  // Implementation here...
}
```
