# Remarks on Event Persistence

## The Synchronization Problem

- Event persistence aims to address the synchronization problem between publishers and subscribers. The problem occurs when:
  - An impatient publisher publishes an event, and
  - One or more subscribers to that event are slow to join the game, and by the time they subscribe, the event has already passed.

## Scenarios

- Within the scope of an application based on Web Components (hereinafter WCs), there are two basic scenarios where we can encounter this lack of synchronicity.
  - A static scenario: At the start of the application, WCs are registered and become operational in an order that is difficult (if not impossible) to precisely determine.
  - A dynamic scenario: New WCs are added to the DOM, and it is not always possible to control the order in which they will be activated, publishing or subscribing to events.
- The best way to deal with this problem, as with all problems, is to prevent it from happening, which is not always possible.
- The framework being developed, for which this Event Bus is primarily intended, applies various strategies to circumvent the problem:

### Static Scenario
 
- For the static scenario, the main strategy is based on deriving all
    components from an abstract class whose `connectedCallback` method is private and,
    in addition to doing many other things, invokes several abstract methods that the
    concrete components must implement (even if empty):
  - `init()`, where the component will perform the necessary preliminary procedures for
    its activity (e.g., handling attributes not foreseen by the abstract class) and where it is assumed that no events of any kind will be published.
  - `subscriptions()`, which, as its name indicates, is where all necessary subscriptions to events controlled by the Event Bus will be made.
  - `render()`, in case something needs to be built in the DOM.
  - `listeners()`, where subscriptions to DOM events, which do not pass through the Event Bus, are made.
  - `start()`, if an active starting point is necessary, perhaps this is the best place, with everything already prepared, to publish the REQUEST_EVENT directly or by using the `request()` method of the Event Bus.
- This strategy can be combined with another:
  - Since the framework will use a library of many components, too many to register and load all into memory, a procedure is used to load only the components that the application actually uses, and which, duly modified, can help avoid synchronicity failures.
  - Here is a detail of the unmodified procedure:

  ```typescript
    /**
    - Registers all web components by iterating through the list of component names and
    - invoking the `registerComponent` method for each name.
    -
    - This method retrieves the names of the web components using the
    - `getWebComponentNames` method and ensures that each component is properly
    - registered within the application.
     */
    private registerComponents() {
        const webComponentNames = this.getWebComponentNames();
        webComponentNames.forEach(name => {
            this.registerComponent(name);
        });
    }

    /**
    - Retrieves a set of all custom web component names present in the current document.
    -
    - A web component is identified by its tag name containing a hyphen ("-"), as per the
    - Web Components specification.
    -
    - @returns {Set<string>} A set of unique web component tag names in lowercase.
     */
    private getWebComponentNames(): Set<string> {
        const webComponentNames = new Set<string>();
        document.querySelectorAll("*").forEach(el => {
            if (el.tagName.toLowerCase().includes("-")) {
                webComponentNames.add(el.tagName.toLowerCase());
            }
        });
        return webComponentNames;
    }

    /**
    - Registers a custom web component by its name. If the component is not already
    - defined, it dynamically imports the component's JavaScript module and defines it as
    - a custom element.
    -
    - @param name - The name of the web component to register. This should follow the
    - custom element naming convention (e.g., "prefix-component").
    -
    - @remarks
    - - The method checks if the component's class name is available in the
    - `componentList` map.
    - - If the component is not already defined in the `customElements` registry, it
    - determines the import path based on the prefix of the component name and the
    - `pathList` map.
    - - If the prefix is not found in the `pathList`, a default path (`DEFAULT_PATH`) is
    - used.
    - - Logs warnings if the component name is not found in the `componentList` or if the
    - path is missing in the `pathList`.
      */
    private registerComponent(name: string) {
        const className = this.componentList.get(name);

        if (className) {
            if (!customElements.get(name)) {
                const prefix = name.split("-")[0];
                let path = this.pathList.get(prefix);

                if (!path) {
                    console.warn(
                        `Path for component "${name}" not found in path list. Using default path "${InformalityApplication.DEFAULT_PATH}".`
                    );
                    path = InformalityApplication.DEFAULT_PATH;
                }

                const importPath = `${path}/${className}.js`;

                this.importAndDefineComponent(name, importPath);
            }
        } else {
            console.warn(`Component ${name} not found in component list.`);
        }
    }

    /**
    - Dynamically imports a module and defines a custom element using the specified name
    - and the default export of the module.
    -
    - @param name - The name to define the custom element with. This should follow the
    - custom element naming convention (e.g., include a hyphen).
    - @param importPath - The path to the module to import. This should be a valid path
    - that resolves to a module exporting a default class.
    - @returns A promise that resolves when the component is successfully imported and
    - defined, or logs an error if the operation fails.
    - @throws Logs an error to the console if the module cannot be imported or the custom
    - element cannot be defined.
     */
    private async importAndDefineComponent(name: string, importPath: string) {
        try {
            const module = await import(importPath);
            const componentClass = module.default;
            customElements.define(name, componentClass);
        } catch (error) {
            console.error(`Error importing component ${name}: ${error}`);
        }
    }
  ```

  - A load priority field could be added to the list of components with three values: HIGH, MEDIUM, and LOW.  
  - First, HIGH-priority components would be activated. These would be non-visual (i.e., without internal HTML, empty `render()` methods, and `listeners()`) and would not publish events outside of handlers and callbacks. In other words, they would only publish events in response to other events (from the DOM or the Event Bus) or the resolution of a promise.  
  - Next, MEDIUM-priority components would be activated. These would have HTML content but would follow the same restrictions on event publishing as HIGH-priority components.  
  - Finally, LOW-priority components would be activated. These would be more proactive, publishing events (including REQUEST_EVENT) outside of handlers and callbacks.  

### Dynamic Scenario  

- For the dynamic scenario, there are two possibilities:  
  - The first is that the newly added component does not require any prior event for activation. It simply subscribes to the necessary events and waits for their next publication. It's like episodic TV series, where you don’t need a “recap” and each episode has a self-contained storyline. However, if any of the events the component subscribes to are persisted for its subscription cluster, it immediately receives the persisted event.  
  - The second is more like serialized TV movies, where you need to remember previous episodes to follow the plot. The key aspect is that, using the persistence mechanism, the "recap" is limited to the last complete episode.  

- If the dynamic component loading were somewhat predictable, persistence could almost entirely be bypassed in favor of the REQUEST_EVENT event. However, keep in mind that **REQUEST_EVENT must always be persisted**, regardless of the value of `persistDefault` or even the `persist` parameter with which it is published. Otherwise, we would encounter the same problem this mechanism aims to eliminate.  

## Conclusion

- Although the application that motivates the development of Eventuality will not need to make
  extensive use of event persistence, it is interesting to give it capabilities that, through
  configuration, allow it to adapt to any type of application.
- Whether an event is persisted or not is fundamentally controlled with the `persist` parameter
  of the `publish: boolean | undefined` method, which has three possible states.
- If this parameter is `undefined`, the value of the member variable supplied to the constructor
  as part of the configuration, `persistDefault: boolean`, is applied.
- If `persist === true`, the event is persisted regardless of the value of `persistDefault`.
  It is persisted for each element in `clusters`, overwriting previous copies if any exist.
- If `persist === false`, the event is not persisted and any stored copies for each of the clusters
  specified in the ongoing publication are deleted, except for the following exceptions:
  - `REQUEST_EVENT` and all events that extend it are always persisted without exception.
  - If at the time of publishing an event, with `persist === false` or with
    `persist === undefined` and `persistDefault === false`, there were no prior subscriptions
    for some of the clusters in the publication, the event is persisted for those clusters, and
    copies are only deleted for clusters that did have prior subscriptions. Additionally, it is
    advisable to write a warning in the console indicating that persistence was forced for such
    and such cluster due to the lack of a prior subscription.
