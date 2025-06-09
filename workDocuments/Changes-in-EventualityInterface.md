# Changes in EventualityInterface

- The `debugMode` variable of the `EventualityInterface` class is made public to allow
  access to it from outside the class and to enable or disable debug mode
  from the browser console using `Eventuality.getInstance().debugMode = true (or
false)`.
- A new `waitTimeout` variable is added, configurable from the class constructor,
  to allow setting a longer wait time between processed events (`await new
  Promise(resolve => setTimeout(resolve, this.waitTimeout));`). We keep it publicly
  accessible in case an application needs to dynamically adjust this value.
- The `clusters` parameter (plural) is changed to `cluster` (singular), and it changes from being a
  `Set<string>` to a `string` representing the cluster name. This simplifies the
  interface and avoids confusion with the concept of clusters as a set of
  identifiers. Now, the condition for a handler to execute is that the subscription's
  cluster belongs to the set of clusters of the published event. The semantics and
  processing related to the `*` cluster remain unchanged for both
  publications and subscriptions.
- A new `request` method is added that allows handlers to both request the
  publication of an event (to obtain data from another component) and to notify another
  component that an active subscription already exists for a specific event. It is a
  convenience method that essentially involves first subscribing to the requested event and
  then publishing a `REQUEST_EVENT` type event, which contains in its payload the type of
  event requested, the handler, and the subscription's cluster. At the end of the method
  definition, there is a comment with an example of a possible implementation.
- In the `src/eventTypes.ts` file, the new event types
  `REQUEST_EVENT` and `REQUEST_EVENT_RESPONSE` have been included to be able to use the new
  `request` method.
  