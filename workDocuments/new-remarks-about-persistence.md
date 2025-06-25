# New Remarks About Persistence

The events published to cluster global "*" must always be persisted**, regardless of the
value of `persistDefault` or even the `persist` parameter with which it is published.
This is because the cluster global "*" is used to synchronize states that, if a component
is interested in, it must be able to retrieve them at any time, even if the component
is loaded after the event was published.
