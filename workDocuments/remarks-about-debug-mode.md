# Comments on the debugging mode and other things

## Debugging Mode

Debug mode is a special mode in which the application runs with additional logging and
diagnostic features enabled. This mode is typically used during development and testing to
help identify and fix issues in the code.

### Logging Methods or Functions

```typescript

  private getEmojiMode(mode: 'PUB' | 'SUB' | 'COG'): string {
    switch (mode) {
      case 'PUB':
        return '📢';
      case 'SUB':
        return '👂';
      case 'COG':
        return '⚙️';
      default:
        return '';
    }
  }

  private getEmojiState(state: 'LOST' | 'FOUND' | 'SYNC'): string {
    switch (state) {
      case 'LOST':
        return '🏝️';
      case 'FOUND':
        return '🛟';
      default:
        return '⚓️';
    }
  }

  /**
   * Logs an event with a box around it for better visibility in the console.
   * @param mode The mode of the event ('PUB', 'SUB', 'COG').
   * - 'PUB' when publishing an event.
   * - 'SUB' when subscribing to an event.
   * - 'COG' when processing an event handler.
   * @param state The state of the event ('LOST', 'FOUND', 'SYNC').
   * - 'LOST' when an event is published without any subscriptions for either of the clusters.
   * - 'FOUND' when a subscription has used a persisted event.
   * - 'SYNC' in all other cases.
   * @param eventType The type of the event.
   * @param clusters The clusters associated with the event.
   * @param className The name of the class or component, if applicable.
   * @param tagName The custom element tag name, if applicable.
   * @param data Additional data to log, if any.
   */
  logWithBox(
    mode: 'PUB' | 'SUB' | 'COG',
    state: 'LOST' | 'FOUND' | 'SYNC',
    eventType: string,
    clusters: Set<string>,
    className?: string,
    tagName?: string,
    data?: unknown
  ) {
    const timestamp = new Date().toISOString();
    const emojiMode = this.getEmojiMode(mode);
    const emojiState = this.getEmojiState(state);

    const logText =
      `[${timestamp}] [${mode} ${emojiMode}] ` +
      `[${state} ${emojiState}] [${eventType}] ` +
      (clusters ? '[' + Array.from(clusters).join(', ') + ']' : '') +
      `${className ?? ''}${tagName ? ' <' + tagName + '>' : ''}`;
    const logData = JSON.stringify(data, null, 2);
    const logTextLength = Math.max(
      logText.length,
      logData ? logData.length : 0
    );
    const border = '┌' + '─'.repeat(logTextLength) + '┐';
    const bottomBorder = '└' + '─'.repeat(logTextLength) + '┘';

    console.log(border);
    console.log(`│${logText}│`);

    if (logData && logData !== '{}') {
      const lines = logData.split('\n');
      for (const line of lines) {
        const padded = line.padEnd(logTextLength, ' ');
        console.log(`│${padded}│`);
      }
    }
    console.log(bottomBorder);
  }
```

### Usage: debug points

**_Note: The following code snippets are examples of how to use the logging methods in
different scenarios. It is just a syntactically imprecise shorthand note and its only
purpose is to briefly explain the use of the logging function._**

#### When publishing an event

```typescript
// Web Component code to publish an event
  Eventuality.getInstance().publish(
    event,
    clusters,
    this.getPersist()
  );
// Eventuality code to log the event
  this.logWithBox(
    'PUB',
    'SYNC', // or 'LOST' if no subscriptions exist for the clusters
    event.eventType,
    clusters,
    undefined, //
    undefined,
    event.data
  );
}
```

#### When subscribing to an event

```typescript
// Web Component code to subscribe to an event
  Eventuality.getInstance().subscribe(
    event.eventType,
    clusters,
    this.getPersist(),
    this.handleEvent.bind(this)
  );
// Eventuality code to log the subscription
  this.logWithBox(
    'SUB',
    'SYNC', // or 'FOUND' if a persisted event was used
    event.eventType,
    [cluster],
    handleEvent.className,
    handleEvent.tagName, 
    undefined
  );
}
```

#### When processing an event handler

```typescript
// Web Component code to process an event handler
  this.handleEvent(event);
// Eventuality code to log the event handler processing
  this.logWithBox(
    'COG',
    'SYNC', // or 'FOUND' if a persisted event was used
    event.eventType,
    clusters,
    handleEvent.className,
    handleEvent.tagName, 
    event.data
  );
}
```

## Other Things

### Further Information Needed / Clarifications

#### `EventHandler` Metadata Usage

>The `className` and `tagName` in `EventHandler` are optional (Req. Doc. Section 1.3).
>Examples of how these are intended to be populated by developers or frameworks would be
>helpful for ensuring debug logs are maximally useful.

It is expected that they will be populated by applying the `@EventMethod` decorator to the
appropriate methods, which will automatically set the `className` and `tagName` properties
based on the decorated method's context. This will allow the debug logs to include the
class and tag names of the event handlers, making it easier to trace the source of events
in the logs.

This decorator is available in [decorators.ts](../src/decorators.ts)

#### `src/eventTypes.ts` don't exist yet

>The `src/eventTypes.ts` file is mentioned in the documentation but does not exist yet.
>All interfaces and types related to events are defined in the `src/Eventuality.ts` module.
