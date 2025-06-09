import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Eventuality, BaseEvent, EventHandler } from '../../src/Eventuality';

function makeHandler<D>(
  fn: (e: BaseEvent<D>) => void,
  className = 'TestHandler'
): EventHandler<D> {
  const handler = fn as EventHandler<D>;
  handler.id = Symbol();
  handler.className = className;
  return handler;
}

beforeEach(() => {
  Eventuality._resetInstance?.();
});

describe('Eventuality - Casos avanzados', () => {
  it('entrega eventos persistidos a nuevos suscriptores', () => {
    const instance = Eventuality.createInstance({
      debugMode: false,
      defaultPersist: true,
    });
    const event = { eventType: 'TEST_EVENT', data: { value: 1 } };
    instance.publish(event, new Set(['A']), true);

    let recibido = false;
    const handler = makeHandler<typeof event.data>(() => {
      recibido = true;
    });
    instance.subscribe(event, handler, 'A');
    expect(recibido).toBe(true);
  });

  it('llama a handleError si un handler lanza error', () => {
    const handleError = vi.fn();
    const instance = Eventuality.createInstance({ handleError });
    const event = { eventType: 'ERR_EVENT', data: {} };
    const handler = makeHandler<typeof event.data>(() => {
      throw new Error('fail');
    });
    instance.subscribe(event, handler, 'B');
    instance.publish(event, new Set(['B']));
    expect(handleError).toHaveBeenCalled();
  });

  it('no entrega eventos persistidos a clusters no relacionados', () => {
    const instance = Eventuality.createInstance({ defaultPersist: true });
    const event = { eventType: 'CLUSTER_EVENT', data: { foo: 42 } };
    instance.publish(event, new Set(['X']), true);

    let recibido = false;
    const handler = makeHandler<typeof event.data>(() => {
      recibido = true;
    });
    instance.subscribe(event, handler, 'Y');
    expect(recibido).toBe(false);
  });

  it('unsubscribe elimina el handler', () => {
    const instance: Eventuality = Eventuality.createInstance();
    const event = { eventType: 'UNSUB_EVENT', data: {} };
    let recibido = false;
    const handler = makeHandler<typeof event.data>(() => {
      recibido = true;
    });
    instance.subscribe(event, handler, 'C');
    instance.unsubscribe(event, handler);
    instance.publish(event, new Set(['C']));
    expect(recibido).toBe(false);
  });

  it('request suscribe y publica REQUEST_EVENT', () => {
    const instance = Eventuality.createInstance();
    const event = { eventType: 'REQ_EVENT', data: { foo: 1 } };
    let recibido = false;
    const handler = makeHandler<typeof event.data>(() => {
      recibido = true;
    });
    instance.request(
      { targetEvent: event, handler, cluster: 'Z' },
      new Set(['Z'])
    );
    // El handler debe recibir el evento persistido si luego se publica
    instance.publish(event, new Set(['Z']));
    expect(recibido).toBe(true);
  });

  it('no permite registrar el mismo handler para distintos eventType', () => {
    const instance = Eventuality.createInstance();
    const handler = makeHandler(() => {});
    const event1 = { eventType: 'E1', data: {} };
    const event2 = { eventType: 'E2', data: {} };
    instance.subscribe(event1, handler, 'A');
    expect(() => instance.subscribe(event2, handler, 'A')).toThrow();
  });

  it('lanza error si se desuscribe un handler no registrado', () => {
    const instance = Eventuality.createInstance();
    const handler = makeHandler(() => {});
    const event = { eventType: 'E', data: {} };
    expect(() => instance.unsubscribe(event, handler)).toThrow();
  });

  it('entrega eventos a handlers suscritos con comodín (*)', () => {
    const instance = Eventuality.createInstance();
    const event = { eventType: 'WILDCARD_EVENT', data: { foo: 1 } };
    let recibido = false;
    const handler = makeHandler<typeof event.data>(() => {
      recibido = true;
    });
    // cluster = '*'
    instance.subscribe(event, handler);
    instance.publish(event, new Set(['ANY']));
    expect(recibido).toBe(true);
  });

  it('entrega eventos a handlers suscritos a cluster específico y comodín', () => {
    const instance = Eventuality.createInstance();
    const event = { eventType: 'MIXED_EVENT', data: { foo: 2 } };
    let recibidoA = false;
    let recibidoWildcard = false;
    const handlerA = makeHandler<typeof event.data>(() => {
      recibidoA = true;
    }, 'A');
    const handlerWildcard = makeHandler<typeof event.data>(() => {
      recibidoWildcard = true;
    }, 'W');
    instance.subscribe(event, handlerA, 'A');
    // cluster = '*'
    instance.subscribe(event, handlerWildcard);
    instance.publish(event, new Set(['A']));
    expect(recibidoA).toBe(true);
    expect(recibidoWildcard).toBe(true);
  });
});
