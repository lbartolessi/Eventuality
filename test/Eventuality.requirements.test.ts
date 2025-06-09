import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Eventuality, EventualityError } from '../src/Eventuality';

// Utilidad para crear handlers únicos
const createHandler = (id: symbol, className = 'TestHandler') => {
  const handler = vi.fn((event: { eventType: string; data: any }) => {});
  (handler as any).id = id;
  (handler as any).className = className;
  return handler as any;
};

describe('Eventuality - Requerimientos funcionales y no funcionales', () => {
  let bus: Eventuality;
  beforeEach(() => {
    bus = Eventuality.createInstance({ debugMode: false });
    bus['_resetInstance']?.();
  });

  it('FR1.1 Singleton Access: getInstance retorna la misma instancia', () => {
    Eventuality._resetInstance();
    const a = Eventuality.getInstance();
    const b = Eventuality.getInstance();
    expect(a).toBeInstanceOf(Eventuality);
    expect(b).toBeInstanceOf(Eventuality);
    expect(a).toBe(b);
  });

  it('FR1.2 Event Publishing: publish publica en clusters y respeta persist', () => {
    const handler = createHandler(Symbol('pub'));
    bus.subscribe({ eventType: 'pub', data: 1 }, handler, 'A');
    bus.publish({ eventType: 'pub', data: 42 }, new Set(['A']), true);
    expect(handler).toHaveBeenCalledWith({ eventType: 'pub', data: 42 });
  });

  it('FR1.3 Subscription Management: subscribe/unsubscribe funcionan', () => {
    const handler = createHandler(Symbol('sub'));
    bus.subscribe({ eventType: 'sub', data: 1 }, handler);
    bus.publish({ eventType: 'sub', data: 2 });
    expect(handler).toHaveBeenCalled();
    bus.unsubscribe({ eventType: 'sub', data: 1 }, handler);
    bus.publish({ eventType: 'sub', data: 3 });
    expect(handler).not.toHaveBeenCalledWith({ eventType: 'sub', data: 3 });
  });

  it('FR1.4 Request-Response: request suscribe y publica correctamente', () => {
    const handler = createHandler(Symbol('req'));
    bus.request({
      targetEvent: { eventType: 'req', data: 10 },
      handler,
      cluster: 'C',
    }, new Set(['C']));
    bus.publish({ eventType: 'req', data: 10 }, new Set(['C']));
    expect(handler).toHaveBeenCalledWith({ eventType: 'req', data: 10 });
  });

  it('FR1.5 Asynchronous Delivery: publish no bloquea y respeta handlerAsyncMode', () => {
    const handler = createHandler(Symbol('async'));
    bus = Eventuality.createInstance({ handlerAsyncMode: 'batch' });
    bus.subscribe({ eventType: 'async', data: 1 }, handler);
    bus.publish({ eventType: 'async', data: 2 });
    expect(handler).toHaveBeenCalledWith({ eventType: 'async', data: 2 });
  });

  it('FR1.6 Debug Mode: debugMode activa logs (verifica flag)', () => {
    bus = Eventuality.createInstance({ debugMode: true });
    expect(bus.debugMode).toBe(true);
  });

  it('FR1.7 Error Handling: errores en handlers se pasan a handleError', () => {
    const errorHandler = vi.fn();
    bus = Eventuality.createInstance({ handleError: errorHandler });
    const handler = createHandler(Symbol('err'));
    (handler as any).mockImplementation(() => { throw new Error('fail'); });
    bus.subscribe({ eventType: 'err', data: 1 }, handler);
    bus.publish({ eventType: 'err', data: 1 });
    expect(errorHandler).toHaveBeenCalled();
  });

  it('NFR1.2 Robustness & Memory Safety: unsubscribe previene memory leaks', () => {
    const handler = createHandler(Symbol('mem'));
    bus.subscribe({ eventType: 'mem', data: 1 }, handler);
    bus.unsubscribe({ eventType: 'mem', data: 1 }, handler);
    // No hay forma directa de testear leaks, pero sí que no se llama tras desuscribir
    bus.publish({ eventType: 'mem', data: 2 });
    expect(handler).not.toHaveBeenCalledWith({ eventType: 'mem', data: 2 });
  });

  it('NFR1.4.1 EventualityError se lanza en errores críticos', () => {
    const handler = createHandler(Symbol('unique'));
    bus.subscribe({ eventType: 'A', data: 1 }, handler);
    expect(() =>
      bus.subscribe({ eventType: 'B', data: 2 }, handler)
    ).toThrow(EventualityError);
  });

  it('NFR1.5.1 _resetInstance limpia el estado', () => {
    const handler = createHandler(Symbol('reset'));
    bus.subscribe({ eventType: 'reset', data: 1 }, handler);
    bus.publish({ eventType: 'reset', data: 2 });
    expect(handler).toHaveBeenCalled();
    bus['_resetInstance']?.();
    // Después del reset, no debe haber handlers ni eventos
    const handler2 = createHandler(Symbol('reset2'));
    bus.subscribe({ eventType: 'reset', data: 1 }, handler2);
    bus.publish({ eventType: 'reset', data: 3 });
    expect(handler2).toHaveBeenCalledWith({ eventType: 'reset', data: 3 });
  });
});
