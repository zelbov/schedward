# Achieving best performance

## Parameters and dereferencing

Traditional `setTimeout` can be used to pass a reference to an object in memory from outside callback's execution scope, which will preserve a reference to that object in heap when it is not needed. Despite it is not considered a good practice, there is basically no prevention mechanism for this kind of mistake. It is possible, so it is being done:

```JS
//...

function outsideScope() {

    // object defined outside setTimeout callback
    const obj = { foo: 'bar' }

    setTimeout(() => {

        // reference is used by a callback
        console.log(obj)

    }, 30000)

    // an object will not be garbage collected for another 30 seconds
    // since reference to it is kept as active because used by a callback
    // even though "outsideScope" function execution completes here

}

outsideScope()
```

A `TaskSchedule.timeout` method makes a deep copy of an object provided as `params` argument to send it to a pool: `JSON.parse(JSON.stringify(params))`

```JS

// ... init task manager and launch a pool beforehand

function outsideScope() {

    // object defined outside timeout listener
    const obj = { foo: 'bar' }

    manager.task('deref').addListener('timeout', e => {

        console.log(e.params); // > { foo: 'bar' }

    })

    // pass referenced object as prameter
    manager.task('deref').timeout('newtask', 30000, obj)

    // ^ this produces a deep copy of "obj" variable
    // before passing it into scheduled task runners pool
    // so original "obj" will be dereferenced at this point
    // and cleaned up with next GC run
    // without waiting for timeout event

}

outsideScope()
```

Therefore a reference to an original object in a main process heap is not kept for a whole wait time before a scheduled operation triggers.

However, a deep copy of an object is kept in a runner's heap instead, which is processed by it's own garbage collector. This allows to balance a garbage collection workload and completely segregate it from main process.

All objects that are defined outside timeout listener, but inside execution scope of a function that called for a `timeout`, will be dereferenced immediately and cleaned up from a heap by next GC run.

If this is not enough to reduce load and runners are throttling anyway, e.g. when reaching heavy loads of requests while using considerably large timespans for scheduling, and/or large amounts of data stored in params object, consider saving your data that should be processed by delayed operation in an external storage instead (e.g. cache) and then load it back for processing within a timeout listener callback:

```JS
// <pseudocode>

// ... init task manager and launch a pool beforehand

function writeToCache(key, value) {

    //... your save-to-cache logic here

}

function readFromCache(key) {

    //... your read-from-cache logic here

}

function reallyBig() {

    const obj = {/*really, really big object here*/}

    // set a callback to be triggered in an hour
    manager.task('load_outside').timeout('taskuid', 3600000)

    manager.task('load_outside').addListener('timeout', e => {

        const reloaded = readFromCache('big_one')

        //... do your hour-delayed things with that big one here

    })

    writeToCache('big_one', obj)

}

reallyBig()
```

## Segregating scheduled tasks from main process

A task runner utilizes it's own event loop and garbage collector within a separate process running in your system, therefore allowing to utizile more CPU threads to handle these. However, it does not execute an actual scheduled task callback code - it is still a responsibility of a main process.

Consecutively, a main process, does not need to handle task schedules in it's own event loop and keep them there for their whole wait time. This allows to leave a main process in charge of processing only application business logic, while a separate process pool handles unwanted event loop and garbage collector cluttering.

To reduce load on a main process by actual code execution, other solutions should be considered such as process pooling of executed code via `cluster`, horizontal scaling (microservices), rewriting compute-intensive code as `native modules`, etc.

## Load balancing

Initially task runners are assigned with their tasks using round-robin load balancing mechanism, which means that every task pushed into pool through `TaskSchedule.timeout` call is being directed to next available process in a pool instead of using all of them.
A `TaskSchedule.clear` call, however, dispatches a message to clear a task across whole process pool, so application does not need to know precisely which runner actually handles a pending scheduled operation.

## Separating scheduled operations by logical purpose

Traditional `setTimeout` approach is similar to so-called unicast event producer. This means that for every scheduled job there is one handler and one task that should be executed. This might be excessive when there are loads of identical tasks being executed, so multicast producers seem to be more convenient approach for this case.

Which is exactly how `TaskSchedule` works in a nutshell: it allows multiple listeners to be assigned to a same job type, while doesn't allow to assign a separate job handler for every job that is triggered by timeout event within a same job group.

[Prev: Task runner and process pool](https://github.com/zelbov/schedward/blob/main/doc/Runner.md) | [Back to Main](https://github.com/zelbov/schedward/blob/main/doc/README.md)
