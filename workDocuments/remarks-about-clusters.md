# Notes about clusters

* Clusters function as a selection mechanism to decide whether a handler executes or not
  for a given event.
  * A **publication** specifies a `Set<string>` of `clusters`.
  * A **subscription** specifies a single `string` for its `cluster`.
  * **A handler executes if its subscribed `cluster` string is present in the publication's `clusters` set, or if the `*` wildcard (universal cluster) applies to either the subscription's `cluster` or any cluster in the publication's set.**
  * If the subscription's `cluster` is not `*`, and the publication's `clusters` set does not contain `*`, then the subscription's `cluster` must be explicitly present in the publication's `clusters` set for the handler to execute.
* A specific handler (identified by its `id: symbol`) executes at most once for each
  publication of its associated event, provided the cluster conditions (as described above) are met.
* A specific handler (`id: symbol`) is usually linked to a single event type, although
  this is not a strict rule. It can also handle multiple events, provided that all share
  the same data format, as this aspect defines the compatibility between different types
  of handlers.
* Therefore, **subscriptions map a handler (identified by `id: symbol`) to an event type (`eventType: string`) and a single `cluster` (string)**.
* The `*` cluster is a wildcard cluster that matches any other cluster. Therefore, if a
  handler is subscribed with the `*` cluster, it will execute for any publication of its associated
  event, regardless of the publication's clusters.
* If an event is published with a `clusters` set that includes `*`, it will be delivered to any handler subscribed to
  that event type, regardless of the handler's subscribed `cluster`.
* The `*` cluster represents the universal set of all possible clusters.
  * For subscriptions, a falsy or unspecified `cluster` defaults to `'*'`.
  * For publications, a falsy or unspecified `clusters` set defaults to `Set(['*'])`.
* A handler is associated with only one `cluster` per `eventType` at any given time.
  If a new subscription is requested for a handler for an event type to which it is already subscribed,
  but with a different `cluster`, the new `cluster` simply replaces the existing `cluster`
  associated with that handler for that specific event type.
  This is because the `cluster` acts purely as a condition to determine whether the handler should execute.
