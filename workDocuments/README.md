# Eventuality Project Overview

## Purpose

The Eventuality project is designed to provide a modular and typed Event Bus for web applications, facilitating efficient communication between components, particularly Web Components. It aims to decouple the interactions between different parts of an application, allowing for a more maintainable and scalable architecture.

## Features

- **Publish-Subscribe Pattern**: Supports a robust publish-subscribe mechanism for event-driven communication.
- **Asynchronous Processing**: Ensures non-blocking operations, allowing the application to remain responsive.
- **Event Persistence**: Stores events for late subscribers, enabling them to receive relevant past events.
- **Clustering Support**: Allows targeted delivery of events to specific groups of subscribers.
- **Debugging Capabilities**: Provides a debug mode for tracing event flows and diagnosing issues.
- **Singleton Implementation**: Ensures a single instance of the Eventuality bus is used throughout the application.

## Getting Started

To get started with the Eventuality project, follow these steps:

1. **Installation**: Clone the repository and install the necessary dependencies.

   ```shell
   npm install @lbartolessi/eventuality
   ```

2. **Usage**: Import the Eventuality module in your application and initialize it.

   ```javascript
   import Eventuality from './src/Eventuality';

   const eventBus = Eventuality.getInstance();
   ```

3. **Publishing Events**: Use the `publish` method to emit events.

   ```javascript
   eventBus.publish('eventType', { data: 'your data' });
   ```

4. **Subscribing to Events**: Register handlers for specific event types.

   ```javascript
   eventBus.subscribe('eventType', (event) => {
       console.log(event.data);
   });
   ```

5. **Documentation**: For detailed information on the architecture, requirements, design, data flow, use cases, API, and glossary, refer to the respective markdown files in the documentation directory.

# Technical Documentation for Eventuality

Eventuality is a modular, type-safe event bus system designed for decoupled communication in web applications. This documentation provides all the technical details, design decisions, and practical examples needed to understand, use, and reimplement Eventuality in any language.

## Key Concepts

- **Event**: A data structure with a type and payload. See `BaseEvent<T>`.
- **Handler**: A function with metadata that processes events. See `EventHandler<T>`.
- **Cluster**: A logical group for event delivery and subscription.
- **Persistence**: Events can be stored and delivered to late subscribers.
- **Singleton**: The event bus is a singleton by default.

## Quick Example

```typescript
const event: BaseEvent<{ userId: number }> = { eventType: 'USER_REGISTERED', data: { userId: 1 } };
const handler: EventHandler<{ userId: number }> = Object.assign(
  (event) => { console.log(event.data.userId); },
  { id: Symbol('handler'), className: 'UserComponent' }
);
const bus = Eventuality.getInstance({ debugMode: true });
bus.subscribe(event, handler, 'main');
bus.publish(event, new Set(['main']), true);
```

For detailed API, see `API.md`. For design and requirements, see `Design.md` and `Requirements.md`.

## Conclusion

The Eventuality project provides a powerful and flexible event bus system that enhances communication within web applications. By following the guidelines in this documentation, developers can effectively implement and utilize the Eventuality system in their projects.
