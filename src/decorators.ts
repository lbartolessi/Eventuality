/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { EventHandler } from './EventHandler.js';

/**
 * Options for the @EventMethod decorator.
 */
interface EventMethodOptions {
  /**
   * Specifies how to get the tagName.
   * Can be the name of a property on the instance that contains the tagName,
   * or a function that will be called with 'this' as the instance to get the tagName.
   * If not provided, it will try to use `this.tagName` (common in WebComponents).
   */
  tagNameSource?: string | ((this: any) => string | undefined);
}

/**
 * Method decorator to transform a class method into an EventHandler<T>.
 * @template T The type of data expected by the event handler.
 * @param options Options to configure the decorator's behavior, such as the tagName source.
 */
export function eventMethod<T>(options?: EventMethodOptions) {
  return function (
    /**
     * Prototype of the class for instance methods.
     */
    target: any,

    /**
     * Name of the decorated method.
     */
    propertyKey: string,

    /** Descriptor of the original method. */
    descriptor: TypedPropertyDescriptor<(payload: T) => void>
  ): TypedPropertyDescriptor<EventHandler<T>> | void {
    const originalMethod = descriptor.value;

    if (typeof originalMethod !== 'function') {
      throw new Error(
        `@EventMethod decorator can only be applied to methods. '${propertyKey}' is not a method.`
      );
    }

    const newDescriptor: TypedPropertyDescriptor<EventHandler<T>> = {
      /**
       * Allow the property to be redefined later if needed.
       */
      configurable: true,
      /**
       * Preserve original enumerability.
       */
      enumerable: descriptor.enumerable,
      /**
       * This getter will be called the first time the decorated property is accessed on an instance.
       */
      get(): EventHandler<T> {
        const instance = this as any;
        const memoizedHandlerKey = Symbol(`__eventHandler_${propertyKey}`);
        if (instance[memoizedHandlerKey]) {
          return instance[memoizedHandlerKey];
        }

        const callablePart = (payload: T): void => {
          originalMethod.call(instance, payload);
        };
        /* This function will call the original method, ensuring the correct 'this' context. */

        /* Get className and tagName. */
        const className = instance.constructor.name;
        let tagName: string | undefined;

        if (options?.tagNameSource) {
          if (typeof options.tagNameSource === 'function') {
            /* If tagNameSource is a function, call it to get the tagName. */
            tagName = options.tagNameSource.call(instance);
          } else if (
            typeof options.tagNameSource === 'string' &&
            typeof instance[options.tagNameSource] === 'string'
          ) {
            /* If tagNameSource is a string (property name) and the instance property is also a string, use it. */
            tagName = instance[options.tagNameSource];
          } else {
            /*
             * options.tagNameSource was provided but was not a usable function,
             * or it was a string but the corresponding instance property was not a string.
             * tagName remains undefined here, allowing fallback logic to apply.
             * This 'else' clause addresses SonarLint S126.
             */
          }
        }

        if (tagName === undefined && typeof instance.tagName === 'string') {
          /* As a fallback, if tagName is still undefined and instance.tagName exists (common for WebComponents), use it. */
          tagName = instance.tagName.toLowerCase();
        }

        const eventHandlerInstance = Object.assign(callablePart, {
          id: Symbol(`${className}.${propertyKey}`),
          className: className,
          /* Unique ID based on class and method */
          tagName: tagName,
        });

        instance[memoizedHandlerKey] = eventHandlerInstance;
        /* Memoize the handler on the instance for future calls. */
        return eventHandlerInstance;
      },
    };

    return newDescriptor;
  };
}
