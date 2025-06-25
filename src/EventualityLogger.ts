import { LogContext } from './interfaces.js';

/**
 * A static logger class for Eventuality.
 * It provides structured logging for debugging purposes.
 */
export class EventualityLogger {
  private static readonly baseStyle = 'font-weight: bold;';
  private static readonly styles = {
    publish: `color: #9C27B0; ${EventualityLogger.baseStyle}`,
    subscribe: `color: #4CAF50; ${EventualityLogger.baseStyle}`,
    unsubscribe: `color: #F44336; ${EventualityLogger.baseStyle}`,
    request: `color: #2196F3; ${EventualityLogger.baseStyle}`,
    handler_execution: `color: #FF9800; ${EventualityLogger.baseStyle}`,
    info: `color: #607D8B; ${EventualityLogger.baseStyle}`,
    error: `color: #D32F2F; ${EventualityLogger.baseStyle}`,
  };

  public static log(context: LogContext): void {
    const { logMessage, style } = this.buildLogMessageAndStyle(context);

    console.groupCollapsed(`%c${logMessage}`, style);
    if (context.payload) {
      console.log('Payload:', context.payload);
    }
    if (context.handler) {
      console.log('Handler Details:', context.handler);
    }
    if (context.error) {
      console.error('Error:', context.error);
    }
    console.groupEnd();
  }

  private static buildLogMessageAndStyle(context: LogContext): //NOSONAR
  {
    logMessage: string;
    style: string;
  } {
    const {
      action,
      eventType,
      handler,
      clusters,
      status,
      message,
      hasSubscribers,
    } = context;

    const clusterString = clusters
      ? `[${Array.from(clusters).join(', ')}]`
      : '';
    const handlerId = handler ? `(ID: ${handler.id})` : '';
    let logMessage = '';
    let style = this.styles[action] ?? this.baseStyle;

    switch (action) {
      case 'publish':
        logMessage = `📢 PUBLISH ${eventType} to ${clusterString}. Subscribers present: ${
          hasSubscribers ? 'Yes' : 'No'
        }.`;
        break;
      case 'subscribe':
        logMessage = `✅ SUBSCRIBE ${
          handler?.className ?? 'Handler'
        } ${handlerId} to ${eventType} on cluster ${clusterString}. ${
          message ?? ''
        }`;
        break;
      case 'unsubscribe':
        logMessage = `❌ UNSUBSCRIBE ${
          handler?.className ?? 'Handler'
        } ${handlerId} from ${eventType}.`;
        break;
      case 'request':
        logMessage = `🔄 REQUEST ${eventType} to ${clusterString}.`;
        break;
      case 'handler_execution':
        if (status === 'success') {
          logMessage = `💡 HANDLER OK for ${eventType}: ${
            handler?.className ?? 'Handler'
          } ${handlerId}.`;
          style = this.styles.handler_execution;
        } else {
          logMessage = `🔧 HANDLER ERROR for ${eventType}: ${
            handler?.className ?? 'Handler'
          } ${handlerId}.`;
          style = this.styles.error;
        }
        break;
      case 'info':
        logMessage = `ℹ️ INFO on ${eventType}: ${message}`;
        style = this.styles.info;
        break;
    }
    return { logMessage, style };
  }
}
