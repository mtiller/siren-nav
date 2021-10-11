# Overview

This package contains utilities for navigating and interacting with Siren based
APIs.  The central idea in this approach is that it should be possible to chain 
together complex sequences of interactions.  What complicates things is the fact 
that the events described do not take place in response to the commands themselves.
Instead, all processing is deferred as long as possible (i.e., until an actual 
result is required).  Fundamentally, there is something inherentily monadic in all
this although that wasn't a direct goal (just a useful pattern).

This is all achieved by the fact that lots of "promises" are being tracked
behind the scenes to describe the results of each processing step.  Further 
complicating things is the fact that some requests that "trigger" the processing 
are not necessarily the end of the chain.

To understand what is going on, consider the following code:

```
nav
    .follow("task")
    .performHyperAction("submit", {
        properties: {
            source: this.state.currentSource,
        }
    })
    .followLocation()
    .follow("result")
    .getSiren();
```

We start with a `SirenNav` instance, `nav`.  This has presumably already been created.
It manages the current "state" of the navigation internally.  That state mainly consists
of knowing what the URL of the current resoure is.  But it **DOES NOT** update the state
after the chain calls like `follow`.  Instead, what it does is record the process by 
which the current state (whatever that happens to be) can be transformed into the 
next step *without actually doing it*.  These chains of state transformations are stored 
up until an actual request is to be made.  In this example, that is the `performHyperAction`
call.  This necessarily must perform a (`POST`) request and returns a `NavResponse` object.
Again, note that this is not itself a promise of anything, but intead a "holder" of a 
promise to the result.  The actual request could have been requested (via the `get` or 
`getSiren` methods).  But in this case, the `followLocation` method transforms returns
a fresh `SirenNav` instance.  In other words, the chaining continues by turning a 
`SirenNav` instance into a `NavResponse` instance and back again into a `SirenNav` 
instance.
