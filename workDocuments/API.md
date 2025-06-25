# API Documentation for Eventuality System

## Overview

The Eventuality system provides a modular and typed Event Bus designed for efficient communication within web applications, particularly for Web Components. This document outlines the public API, detailing the classes, interfaces, methods, and properties available for developers to interact with the Eventuality system.

## Table of Contents

1. [Core Classes](#core-classes)
   - [Eventuality](#eventuality)
   - [EventualityOptions](#eventualityoptions)
   - [BaseEvent](#baseevent)
   - [EventHandler](#eventhandler)
2. [Public API Methods](#public-api-methods)
   - [publish](#publish)
   - [subscribe](#subscribe)
   - [unsubscribe](#unsubscribe)
   - [request](#request)
3. [Usage Examples](#usage-examples)

## Core Classes

### Eventuality

The `Eventuality` class is the core facade of the Eventuality system, implementing the Singleton pattern. It manages event publishing, subscription, and persistence.

#### Properties

- `debugMode: boolean`: Enables or disables debug logging.
- `waitTimeout: number`: Configurable timeout for event processing.

#### Methods

- `static getInstance(options: EventualityOptions): Eventuality`: Retrieves the singleton instance of the Eventuality class.
- `static createInstance(options: EventualityOptions): Eventuality`: Creates a new instance (not singleton, for testing).
- `publish<T extends BaseEvent<D>, D>(event: T, clusters?: Set<string>, persist?: boolean): void`: Publishes an event.
- `subscribe<T extends BaseEvent<D>, D>(event: T, handler: EventHandler<D>, cluster?: string): void`: Subscribes a handler.
- `unsubscribe<T extends BaseEvent<D>, D>(event: T, handler: EventHandler<D>): void`: Unsubscribes a handler.
- `request<T extends BaseEvent<D>, D>(requestDetails: { targetEvent: T; handler: EventHandler<D>; cluster: string }, clustersToPublishRequestEvent: Set<string>): void`: Request-response pattern.

### EventualityOptions

The `EventualityOptions` interface defines the configuration options for initializing the Eventuality instance.

#### Properties

- `debugMode?: boolean`: Optional flag to enable debug mode.
- `defaultPersist?: boolean`: Determines if events should be persisted by default.
- `handleError?: (error: Error, event: BaseEvent<any>, handler?: EventHandler<any>) => void`: Custom error handling function.
- `waitTimeout?: number`: Sets the default wait timeout for event processing.

### BaseEvent

The `BaseEvent<T>` interface represents the structure of an event within the Eventuality system.

#### Properties

- `eventType: string`: The type of the event.
- `data: T`: The payload associated with the event.

### EventHandler

The `EventHandler<T>` interface defines the structure of a function that processes events.

#### Properties

- `id: symbol`: Unique identifier for the handler.
- `className: string`: Name of the class where the handler is defined.
- `tagName?: string`: Tag name associated with the handler.

## Public API Methods

### publish<T extends BaseEvent<D>, D>(event: T, clusters?: Set<string>, persist?: boolean): void

Publishes an event to the Eventuality bus.

#### Parameters

- `event`: An instance of `BaseEvent<T>` to be published.
- `clusters`: Set of cluster IDs (optional).
- `persist`: Whether to persist the event (optional).

### subscribe<T extends BaseEvent<D>, D>(event: T, handler: EventHandler<D>, cluster?: string): void

Registers a handler for a specific event type and cluster.

#### Parameters

- `event`: The event type to subscribe to.
- `handler`: The handler function that will process the event.
- `cluster`: The cluster to subscribe to (optional).

### unsubscribe<T extends BaseEvent<D>, D>(event: T, handler: EventHandler<D>): void

Unregisters a previously registered handler for a specific event type.

#### Parameters

- `event`: The event type to unsubscribe from.
- `handler`: The handler to be removed.

### request<T extends BaseEvent<D>, D>(requestDetails: { targetEvent: T; handler: EventHandler<D>; cluster: string }, clustersToPublishRequestEvent: Set<string>): void

Initiates a request-response pattern by publishing a request event and subscribing a handler.

#### Parameters

- `requestDetails`: Object with `targetEvent`, `handler`, and `cluster`.
- `clustersToPublishRequestEvent`: Set of clusters to publish the request event to.

## Usage Examples

### Example 1: Basic Event Publishing

```typescript
const bus = Eventuality.getInstance();
const event = { eventType: 'USER_REGISTERED', data: { userId: 123 } };
bus.publish(event, new Set(['main']));
```

### Example 2: Subscribing to Events

```typescript
const handler = Object.assign((e) => console.log(e.data.userId), { id: Symbol('h'), className: 'UserComponent' });
bus.subscribe(event, handler, 'main');
```

### Example 3: Unsubscribing from Events

```typescript
bus.unsubscribe(event, handler);
```

### Example 4: Request-Response Pattern

```typescript
const requestEvent = { eventType: 'REQUEST_EVENT', data: { targetEvent: event, handler, cluster: 'main' } };
bus.request(requestEvent.data, new Set(['main']));
```

### Example 5: Custom Error Handling

```typescript
const bus = Eventuality.getInstance({
  handleError: (err, event) => {
    console.error('Custom error:', err, event.eventType);
  }
});
```

## Conclusion

This API documentation provides a comprehensive overview of the Eventuality system's public interface. Developers can utilize these classes and methods to effectively implement event-driven communication in their applications. For further details, refer to the other documentation files in the Eventuality project.
