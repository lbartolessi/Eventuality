import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Eventuality, EventualityError } from '../src/Eventuality';

interface TestEventData {
  value: number;
}

const createHandler = (id: symbol, className = 'TestHandler') => {
  const handler = vi.fn((event: { eventType: string; data: TestEventData }) => {});
  (handler as any).id = id;
  (handler as any).className = className;
  return handler as any;
};

describe('Eventuality', () => {
  let bus: Eventuality;
  beforeEach(() => {
    bus = Eventuality.createInstance({ debugMode: false });
    bus['_resetInstance']?.(); // Si existe, limpia el singleton
  });

  it('permite suscribirse y recibir eventos', () => {
    const handler = createHandler(Symbol('h1'));
    bus.subscribe({ eventType: 'test', data: { value: 1 } }, handler);
    bus.publish({ eventType: 'test', data: { value: 42 } });
    expect(handler).toHaveBeenCalledWith({ eventType: 'test', data: { value: 42 } });
  });

  it('no llama a handlers de otros eventos', () => {
    const handler = createHandler(Symbol('h2'));
    bus.subscribe({ eventType: 'test', data: { value: 1 } }, handler);
    bus.publish({ eventType: 'other', data: { value: 99 } });
    expect(handler).not.toHaveBeenCalled();
  });

  it('soporta clusters y comodines', () => {
    const handlerA = createHandler(Symbol('a'));
    const handlerB = createHandler(Symbol('b'));
    bus.subscribe({ eventType: 'test', data: { value: 1 } }, handlerA, 'A');
    bus.subscribe({ eventType: 'test', data: { value: 1 } }, handlerB, '*');
    bus.publish({ eventType: 'test', data: { value: 5 } }, new Set(['A']));
    expect(handlerA).toHaveBeenCalled();
    expect(handlerB).toHaveBeenCalled();
  });

  it('persiste eventos si se indica', () => {
    const handler = createHandler(Symbol('persist'));
    bus.publish({ eventType: 'persisted', data: { value: 7 } }, new Set(['X']), true);
    bus.subscribe({ eventType: 'persisted', data: { value: 0 } }, handler, 'X');
    expect(handler).toHaveBeenCalledWith({ eventType: 'persisted', data: { value: 7 } });
  });

  it('desuscribe correctamente', () => {
    const handler = createHandler(Symbol('h3'));
    bus.subscribe({ eventType: 'test', data: { value: 1 } }, handler);
    bus.unsubscribe({ eventType: 'test', data: { value: 1 } }, handler);
    bus.publish({ eventType: 'test', data: { value: 2 } });
    expect(handler).not.toHaveBeenCalledWith({ eventType: 'test', data: { value: 2 } });
  });

  it('lanza error si se intenta suscribir el mismo handler a dos eventos', () => {
    const handler = createHandler(Symbol('unique'));
    bus.subscribe({ eventType: 'A', data: { value: 1 } }, handler);
    expect(() =>
      bus.subscribe({ eventType: 'B', data: { value: 2 } }, handler)
    ).toThrow(EventualityError);
  });

  it('llama a handleError en caso de error en el handler', () => {
    const errorHandler = vi.fn();
    bus = Eventuality.createInstance({ handleError: errorHandler });
    const handler = createHandler(Symbol('err'));
    (handler as any).mockImplementation(() => { throw new Error('fail'); });
    bus.subscribe({ eventType: 'err', data: { value: 1 } }, handler);
    bus.publish({ eventType: 'err', data: { value: 1 } });
    expect(errorHandler).toHaveBeenCalled();
  });

  it('permite request y ejecuta el handler solicitado', () => {
    const handler = createHandler(Symbol('req'));
    bus.request({
      targetEvent: { eventType: 'req', data: { value: 10 } },
      handler,
      cluster: 'C',
    }, new Set(['C']));
    bus.publish({ eventType: 'req', data: { value: 10 } }, new Set(['C']));
    expect(handler).toHaveBeenCalledWith({ eventType: 'req', data: { value: 10 } });
  });

  it('soporta múltiples handlers para el mismo evento y cluster', () => {
    const handler1 = createHandler(Symbol('m1'));
    const handler2 = createHandler(Symbol('m2'));
    bus.subscribe({ eventType: 'multi', data: { value: 1 } }, handler1, 'Z');
    bus.subscribe({ eventType: 'multi', data: { value: 1 } }, handler2, 'Z');
    bus.publish({ eventType: 'multi', data: { value: 2 } }, new Set(['Z']));
    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it('no permite handlers sin id', () => {
    const handler = vi.fn();
    (handler as any).className = 'NoId';
    expect(() =>
      bus.subscribe({ eventType: 'bad', data: { value: 1 } }, handler as any)
    ).toThrow(EventualityError);
  });
});
