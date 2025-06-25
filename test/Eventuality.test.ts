import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
  type Mock,
  type MockInstance,
} from 'vitest';
import { Eventuality } from '../src/Eventuality.js';
import { createTypedEvent, RequestPayload } from '../src/interfaces.js';
import { EventualityLogger } from '../src/EventualityLogger.js';

// Mock the logger to prevent console output during tests and to allow spying
vi.mock('../src/EventualityLogger.js', () => ({
  EventualityLogger: {
    log: vi.fn(),
  },
}));

// --- Global Test Setup ---
let eventuality: Eventuality;
let handleError: Mock; // Use Mock type for better type inference
let testComponent: TestComponent; // Instance of TestComponent
let userLoginSpy: MockInstance<[{ userId: string }], void>;
let systemShutdownSpy: MockInstance<[], void>;

// Define common events
const userLoggedInEvent = createTypedEvent<{ userId: string }>(
  'USER_LOGGED_IN'
);
const userLoggedOutEvent = createTypedEvent<{ userId: string }>(
  'USER_LOGGED_OUT'
);
const systemShutdownEvent = createTypedEvent<void>('SYSTEM_SHUTDOWN');
const dataProcessingEvent = createTypedEvent<{ data: string }>(
  'DATA_PROCESSING'
);

// A mock class to create handlers from
class TestComponent {
  onUserLogin(payload: { userId: string }) {
    // Handler logic
  }
  onSystemShutdown() {
    // Handler logic
  }
}

describe('Eventuality Unit Tests', () => {
  beforeEach(() => {
    // Reset the singleton instance for each test suite
    Eventuality._resetInstance();
    // Reset handleError mock for each test
    handleError = vi.fn();
    eventuality = Eventuality.createInstance({
      debugMode: true, // Enable debug mode to test logging calls
      handleError,
    });
    // Clear all mocks (including EventualityLogger.log)
    vi.clearAllMocks();

    // Setup common test component and spies
    testComponent = new TestComponent();
    // Spy on prototype methods to catch calls from handlers created with createEventHandler
    userLoginSpy = vi.spyOn(TestComponent.prototype, 'onUserLogin');
    systemShutdownSpy = vi.spyOn(TestComponent.prototype, 'onSystemShutdown');
  });

  // --- Existing Test Suites ---

  describe('FR-002: Event Subscription (subscribe)', () => {
    it('AC-002.5: should subscribe a handler and deliver a published event', () => {
      const handler = Eventuality.createEventHandler(
        testComponent.onUserLogin,
        testComponent
      );
      eventuality.subscribe(userLoggedInEvent, handler);
      eventuality.publish(userLoggedInEvent, { userId: 'user-123' });
      expect(userLoginSpy).toHaveBeenCalledOnce();
      expect(userLoginSpy).toHaveBeenCalledWith({ userId: 'user-123' });
    });

    it('AC-002.2: should ignore a duplicate subscription to the same event and cluster', () => {
      const handler = Eventuality.createEventHandler(
        testComponent.onUserLogin,
        testComponent
      );
      eventuality.subscribe(userLoggedInEvent, handler); // First subscription
      eventuality.subscribe(userLoggedInEvent, handler); // Second subscription (duplicate)
      eventuality.publish(userLoggedInEvent, { userId: 'user-123' });
      expect(userLoginSpy).toHaveBeenCalledOnce(); // Should only be called once
      expect(EventualityLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'subscribe',
          message: expect.stringContaining('Exact duplicate subscription'),
        })
      );
    });

    it('AC-022.3: should handle an error when subscribing the same handler to a different cluster', () => {
      const handler = Eventuality.createEventHandler(
        testComponent.onUserLogin,
        testComponent
      );
      eventuality.subscribe(userLoggedInEvent, handler, 'cluster-A');
      eventuality.subscribe(userLoggedInEvent, handler, 'cluster-B'); // Attempt to subscribe to different cluster
      expect(handleError).toHaveBeenCalledOnce();
      expect(handleError.mock.calls[0][0].message).toContain(
        'Please unsubscribe first before subscribing to a different cluster'
      );
    });

    it('AC-002.4: should handle an error when subscribing the same handler to a different event type', () => {
      const handler = Eventuality.createEventHandler(
        testComponent.onUserLogin,
        testComponent
      );
      eventuality.subscribe(userLoggedInEvent, handler);
      eventuality.subscribe(userLoggedOutEvent, handler); // Attempt to subscribe to different event
      expect(handleError).toHaveBeenCalledOnce();
      expect(handleError.mock.calls[0][0].message).toContain(
        'A handler instance can only be registered for one event type'
      );
    });

    it('AC-002.1: should throw an error if an invalid handler is provided', () => {
      const invalidHandler: any = () => {}; // Not created with createEventHandler
      expect(() =>
        eventuality.subscribe(userLoggedInEvent, invalidHandler)
      ).toThrow('Invalid handler provided');
    });
  });

  describe('FR-001: Event Publishing (publish)', () => {
    it('should deliver events to handlers on a specific cluster', () => {
      const componentA = new TestComponent();
      const spyA = vi.spyOn(TestComponent.prototype, 'onUserLogin');
      const handlerA = Eventuality.createEventHandler(
        componentA.onUserLogin,
        componentA
      );
      eventuality.subscribe(userLoggedInEvent, handlerA, 'cluster-A');

      const componentB = new TestComponent();
      const spyB = vi.spyOn(TestComponent.prototype, 'onUserLogin');
      const handlerB = Eventuality.createEventHandler(
        componentB.onUserLogin,
        componentB
      );
      eventuality.subscribe(userLoggedInEvent, handlerB, 'cluster-B');

      eventuality.publish(
        userLoggedInEvent,
        { userId: 'user-abc' },
        new Set(['cluster-A'])
      );

      expect(spyA).toHaveBeenCalledOnce();
      expect(spyB).not.toHaveBeenCalled();
    });

    it('should deliver events to handlers on the ALL_CLUSTERS scope', () => {
      const handler = Eventuality.createEventHandler(
        testComponent.onUserLogin,
        testComponent
      );
      eventuality.subscribe(userLoggedInEvent, handler); // Subscribe to '*'
      eventuality.publish(
        userLoggedInEvent,
        { userId: 'user-def' },
        new Set(['cluster-C'])
      );
      expect(userLoginSpy).toHaveBeenCalledOnce();
    });

    it('should deliver events published to ALL_CLUSTERS to all subscribers', () => {
      const spyA = vi.fn();
      const handlerA = Eventuality.createEventHandler(spyA, {});
      eventuality.subscribe(userLoggedInEvent, handlerA, 'cluster-A');

      const spyB = vi.fn();
      const handlerB = Eventuality.createEventHandler(spyB, {});
      eventuality.subscribe(userLoggedInEvent, handlerB, 'cluster-B');

      const spyC = vi.fn();
      const handlerC = Eventuality.createEventHandler(spyC, {});
      eventuality.subscribe(userLoggedInEvent, handlerC); // ALL_CLUSTERS

      eventuality.publish(userLoggedInEvent, { userId: 'user-xyz' }); // Publish to '*'

      expect(spyA).toHaveBeenCalledOnce();
      expect(spyB).toHaveBeenCalledOnce();
      expect(spyC).toHaveBeenCalledOnce();
    });
  });

  describe('FR-003: Event Unsubscription (unsubscribe)', () => {
    it('AC-003.4: should stop delivering events to a handler after it unsubscribes', () => {
      const handler = Eventuality.createEventHandler(
        testComponent.onUserLogin,
        testComponent
      );
      eventuality.subscribe(userLoggedInEvent, handler);
      eventuality.publish(userLoggedInEvent, { userId: 'first-call' });
      expect(userLoginSpy).toHaveBeenCalledTimes(1);

      eventuality.unsubscribe(userLoggedInEvent, handler);
      eventuality.publish(userLoggedInEvent, { userId: 'second-call' });
      expect(userLoginSpy).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('AC-003.2: should do nothing when unsubscribing a handler that is not subscribed', () => {
      const handler = Eventuality.createEventHandler(
        testComponent.onUserLogin,
        testComponent
      );
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      expect(() =>
        eventuality.unsubscribe(userLoggedInEvent, handler)
      ).not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('not subscribed')
      );
      consoleWarnSpy.mockRestore();
    });

    it('AC-003.3: should handle an error when unsubscribing with the wrong event type', () => {
      const handler = Eventuality.createEventHandler(
        testComponent.onUserLogin,
        testComponent
      );
      eventuality.subscribe(userLoggedInEvent, handler);
      eventuality.unsubscribe(userLoggedOutEvent, handler); // Attempt to unsubscribe from the wrong event
      expect(handleError).toHaveBeenCalledOnce();
      expect(handleError.mock.calls[0][0].message).toContain(
        'is subscribed to a different event'
      );
    });
  });

  describe('FR-005: Event Persistence', () => {
    it('AC-001.2 & AC-005.1: should persist an event if no subscribers are present', () => {
      eventuality.publish(systemShutdownEvent, undefined);
      expect(EventualityLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'publish',
          eventType: 'SYSTEM_SHUTDOWN',
          hasSubscribers: false,
        })
      );
    });

    it('AC-002.7 & AC-005.2: should deliver a persisted event upon new subscription', () => {
      eventuality.publish(systemShutdownEvent, undefined); // Publish when no one is listening
      const handler = Eventuality.createEventHandler(
        testComponent.onSystemShutdown,
        testComponent
      );
      eventuality.subscribe(systemShutdownEvent, handler); // Subscribe a handler
      expect(systemShutdownSpy).toHaveBeenCalledOnce();
    });

    it('AC-005.4: should clear a persisted event after it has been delivered', () => {
      eventuality.publish(systemShutdownEvent, undefined);
      const component1 = new TestComponent();
      const spy1 = vi.spyOn(TestComponent.prototype, 'onSystemShutdown');
      const handler1 = Eventuality.createEventHandler(
        component1.onSystemShutdown,
        component1
      );
      eventuality.subscribe(systemShutdownEvent, handler1);
      expect(spy1).toHaveBeenCalledOnce();

      const component2 = new TestComponent();
      const spy2 = vi.spyOn(TestComponent.prototype, 'onSystemShutdown');
      const handler2 = Eventuality.createEventHandler(
        component2.onSystemShutdown,
        component2
      );
      eventuality.subscribe(systemShutdownEvent, handler2);
      expect(spy2).not.toHaveBeenCalled(); // Should NOT receive the event again
    });
  });

  describe('FR-004: Request/Reply Mechanism', () => {
    // Define request/response events and payloads
    interface GetUserDataResponse {
      name: string;
      email: string;
    }
    interface GetUserDataRequest extends RequestPayload<GetUserDataResponse> {
      userId: string;
    }
    const getUserDataEvent =
      createTypedEvent<GetUserDataRequest>('GET_USER_DATA');

    it('AC-004.4: should successfully complete a request-reply cycle', async () => {
      const responderHandler = (payload: GetUserDataRequest) => {
        const response: GetUserDataResponse = {
          name: 'John Doe',
          email: 'john.doe@example.com',
        };
        eventuality.publish(payload.replyTo!, response);
      };
      const responder = Eventuality.createEventHandler(responderHandler, {});
      eventuality.subscribe(getUserDataEvent, responder, 'backend-service');

      const requestPayload: Omit<GetUserDataRequest, 'replyTo'> = {
        userId: 'user-123',
        clusterTo: 'backend-service',
      };
      const responsePromise = eventuality.request(
        getUserDataEvent,
        requestPayload
      );

      await expect(responsePromise).resolves.toEqual({
        name: 'John Doe',
        email: 'john.doe@example.com',
      });
      expect(EventualityLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'request',
          eventType: 'GET_USER_DATA',
        })
      );
    });

    it('AC-004.3: should time out if no reply is received', async () => {
      vi.useFakeTimers();
      const requestPromise = eventuality.request(
        getUserDataEvent,
        { userId: 'user-404', clusterTo: 'void' },
        undefined,
        1000
      );
      vi.advanceTimersByTime(1001);
      await expect(requestPromise).rejects.toThrow(
        'Request for event "GET_USER_DATA" timed out after 1000ms.'
      );
      vi.useRealTimers();
    });
  });

  describe('FR-006: Error Handling Policies', () => {
    const dataProcessingEvent = createTypedEvent<{ data: string }>(
      'DATA_PROCESSING'
    );

    it('AC-006.6: should continue processing other handlers by default (continue policy)', () => {
      handleError.mockReturnValue(undefined); // Global returns undefined, so 'continue' is default
      const faultySpy = vi.fn(() => {
        throw new Error('Something went wrong!');
      });
      const faultyHandler = Eventuality.createEventHandler(faultySpy, {});
      const secondSpy = vi.fn();
      const secondHandler = Eventuality.createEventHandler(secondSpy, {});

      eventuality.subscribe(dataProcessingEvent, faultyHandler);
      eventuality.subscribe(dataProcessingEvent, secondHandler);
      eventuality.publish(dataProcessingEvent, { data: 'test' });

      expect(faultySpy).toHaveBeenCalledOnce();
      expect(handleError).toHaveBeenCalledOnce();
      expect(secondSpy).toHaveBeenCalledOnce(); // Second handler should still be executed
    });

    it('AC-006.4: should stop event propagation when policy is "stop_event"', () => {
      handleError.mockReturnValue('stop_event');
      const faultySpy = vi.fn(() => {
        throw new Error('Stop everything!');
      });
      const faultyHandler = Eventuality.createEventHandler(faultySpy, {});
      const secondSpy = vi.fn();
      const secondHandler = Eventuality.createEventHandler(secondSpy, {});

      eventuality.subscribe(dataProcessingEvent, faultyHandler);
      eventuality.subscribe(dataProcessingEvent, secondHandler);
      eventuality.publish(dataProcessingEvent, { data: 'test' });

      expect(faultySpy).toHaveBeenCalledOnce();
      expect(handleError).toHaveBeenCalledOnce();
      expect(secondSpy).not.toHaveBeenCalled(); // Second handler should NOT be executed
    });

    it('AC-006.5: should disable a handler when policy is "disable_handler"', () => {
      handleError.mockReturnValue('disable_handler');
      const faultySpy = vi.fn(() => {
        if (faultySpy.mock.calls.length === 1) {
          throw new Error('Disable me!');
        }
      });
      const faultyHandler = Eventuality.createEventHandler(faultySpy, {});

      eventuality.subscribe(dataProcessingEvent, faultyHandler);
      eventuality.publish(dataProcessingEvent, { data: 'first' });
      expect(faultySpy).toHaveBeenCalledTimes(1);
      expect(handleError).toHaveBeenCalledTimes(1);

      eventuality.publish(dataProcessingEvent, { data: 'second' });
      expect(faultySpy).toHaveBeenCalledTimes(1); // Not called again, as handler is disabled
    });

    describe('AC-006.2: should prioritize global policy over handler-specific policy', () => {
      it('should prioritize global policy when it explicitly returns a value', () => {
        handleError.mockReturnValue('stop_event'); // Global explicitly returns 'stop_event'
        const faultySpy = vi.fn(() => {
          throw new Error('Global should win!');
        });
        const faultyHandler = Eventuality.createEventHandler(
          faultySpy,
          {},
          'disable_handler'
        ); // Handler wants 'disable_handler'

        eventuality.subscribe(dataProcessingEvent, faultyHandler);
        const secondSpy = vi.fn();
        const secondHandler = Eventuality.createEventHandler(secondSpy, {});
        eventuality.subscribe(dataProcessingEvent, secondHandler);

        eventuality.publish(dataProcessingEvent, { data: 'test' });

        expect(faultySpy).toHaveBeenCalledOnce();
        expect(handleError).toHaveBeenCalledOnce();
        expect(secondSpy).not.toHaveBeenCalled(); // Global 'stop_event' should prevent secondHandler from running
      });

      it('should fall back to handler-specific policy when global policy returns undefined', () => {
        handleError.mockReturnValue(undefined); // Global returns undefined (no explicit decision)
        const faultySpy = vi.fn(() => {
          if (faultySpy.mock.calls.length === 1) {
            throw new Error('Handler should win!');
          }
        });
        const faultyHandler = Eventuality.createEventHandler(
          faultySpy,
          {},
          'disable_handler'
        ); // Handler wants 'disable_handler'

        eventuality.subscribe(dataProcessingEvent, faultyHandler);
        eventuality.publish(dataProcessingEvent, { data: 'first' });
        expect(faultySpy).toHaveBeenCalledTimes(1);
        expect(handleError).toHaveBeenCalledOnce();

        eventuality.publish(dataProcessingEvent, { data: 'second' });
        expect(faultySpy).toHaveBeenCalledTimes(1); // Not called again, as handler was disabled by its own policy
      });
    });
  });

  describe('Instance Management & Logging', () => {
    const testEvent = createTypedEvent<{ data: number }>('TEST_EVENT'); // Changed payload type to match usage

    describe('NFR-005: Singleton Pattern', () => {
      it('should return the same instance on subsequent calls to getInstance', () => {
        const instance1 = Eventuality.getInstance({ debugMode: true });
        const instance2 = Eventuality.getInstance(); // No options on second call
        expect(instance1).toBe(instance2);
      });

      it('should throw an error if getInstance is called first without options', () => {
        Eventuality._resetInstance(); // Ensure no instance exists
        expect(() => Eventuality.getInstance()).toThrow(
          'No options provided. `getInstance` needs an options parameter on the first call.'
        );
      });

      it('should use options only from the first getInstance call', () => {
        const instance1 = Eventuality.getInstance({
          debugMode: true,
          waitTimeout: 100,
        });
        const instance2 = Eventuality.getInstance({
          debugMode: false,
          waitTimeout: 200,
        }); // These options should be ignored
        expect(instance1.debugMode).toBe(true);
        expect(instance1.waitTimeout).toBe(100);
        expect(instance2.debugMode).toBe(true); // Should still be true from first call
        expect(instance2.waitTimeout).toBe(100); // Should still be 100 from first call
      });

      it('_resetInstance should allow creating a new singleton instance', () => {
        const instance1 = Eventuality.getInstance({ debugMode: true });
        Eventuality._resetInstance();
        const instance2 = Eventuality.getInstance({ debugMode: false });
        expect(instance1).not.toBe(instance2);
        expect(instance2.debugMode).toBe(false);
      });
    });

    describe('FR-007: Debug Logging', () => {
      it('AC-007.1: should not log when debugMode is false', () => {
        const eventualityNoDebug = Eventuality.createInstance({
          debugMode: false,
        });
        eventualityNoDebug.publish(testEvent, undefined);
        expect(EventualityLogger.log).not.toHaveBeenCalled();
      });

      it('AC-007.2: should log a "publish" action when debugMode is true', () => {
        eventuality.publish(testEvent, { data: 1 });
        expect(EventualityLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'publish',
            eventType: 'TEST_EVENT',
            payload: { data: 1 },
          })
        );
      });

      it('AC-007.2: should log a successful "handler_execution" action', () => {
        const handler = Eventuality.createEventHandler(() => {}, {});
        eventuality.subscribe(testEvent, handler);
        eventuality.publish(testEvent, undefined);
        expect(EventualityLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'handler_execution',
            status: 'success',
            eventType: 'TEST_EVENT',
          })
        );
      });

      it('AC-007.2: should log a failed "handler_execution" action', () => {
        const error = new Error('Handler failed!');
        const handler = Eventuality.createEventHandler(() => {
          throw error;
        }, {});
        eventuality.subscribe(testEvent, handler);
        eventuality.publish(testEvent, undefined);

        expect(EventualityLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'handler_execution',
            status: 'error',
            eventType: 'TEST_EVENT',
            error: error,
          })
        );
      });
    });
  });
});
