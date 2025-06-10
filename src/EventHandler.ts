
/**
 * Event handler interface for Eventuality.
 * @template T The type of the event data.
 */
export interface EventHandler<T> {
  (payload: T): void;
  id: symbol;
  className: string;
  tagName: string | null;
}

/**
 * Event handler class for Eventuality.
 * @template T The type of the event data.
 */
export class EventHandlerClass<T>  {
  private readonly fn: (payload: T) => void;
  id: symbol = Symbol("EventHandlerID");
  className: string;
  tagName: string | null;

  constructor(method: (payload: T) => void, instance: any) {
    this.fn = method;

    // Obtener el nombre de la clase desde la instancia
    this.className = instance.constructor.name;

    // Si es un Custom Element, obtener su tagName
    this.tagName = instance instanceof HTMLElement ? instance.localName : null;

    // Hacer que la instancia sea callable
    return Object.setPrototypeOf((payload: T) => this.fn(payload), new.target.prototype);
  }
}
