# TaskManager

A `TaskManager` is an instance of scheduled tasks operator for an application. It is highly recommended to use it once per application runtime (singleton), since every task manager launches it's own runners pool.

```JS
import { TaskManager } from 'schedward'

const manager = new TaskManager()
```

Manager stores references to running workers ([runners](https://github.com/zelbov/schedward/blob/main/doc/Runner.md)) and [task schedules](https://github.com/zelbov/schedward/blob/main/doc/Schedule.md), serving as a main interface for task scheduling, managing schedules and passing requests to process pool. Also, it handles failover API such as task [registry](https://github.com/zelbov/schedward/blob/main/doc/Registry.md) snapshooting and loading.

## Launching a process pool

```TS
manager.launch(concurrency: number, callback?: () => void): void
```

Example:

```JS
/* Launch with 8 processes in a pool*/
manager.launch(8)
```

This has to be done before any task scheduling or restoring task registries, since it can only accept commands when an actual pool is running. Stopping and re-launching a process pool during workload is supported too, but may result in losing data and negating asynchronously called scheduled command queueing due to errors.

A `launch()` call is asynchronous by itself. It accepts callback which is executed when all workers are present in a pool and responded with their init signal.
Consider setting up your task listeners and using timeout calls only after a callback triggers, otherwise manager will still throw `Task manager is idle` error upon receiving commands beforehand.

```JS
// no callback provided
manager.launch(8)

// synchronous call without waiting for pool rollup will cause error here
manager.task('foo').timeout('bar', 1000)

// -> Error: Task manager is idle. Start a process pool by using `launch()` method and wait for a callback
```

An example of correct approach is the following:

```JS
manager.launch(8, () => {

    // this will be called only when task runner pool is ready
    manager.task('foo').timeout('bar', 1000)

})
```

However, it is still possible to define listeners for task schedules before launching or after stopping a runners pool, since schedules are not bound to it, like that:

```JS
manager.task('anytask').addListener('timeout', () => {
    //... do anything
})

manager.launch(8, () => {
    manager.task('anytask').timeout('anyid', 1000)
})
```

For async/await syntax, there is another version of `TaskManager` provided by `schedward/async` module scope:

```JS
import { TaskManager } from 'schedward/async'

const manager = new TaskManager();

(async() => {

    await manager.launch(8)

    manager.task('foo').timeout('bar', 1000)

})();

```

Task manager provided in this variant supports using awaiters for all asynchronous methods: `launch`, `stop` and `makeTaskRegistrySnapshot`.
There is no functional difference between async/await and callback approaches in this module, rather async version of TaskManager is just a wrap-around for convenience.

## Stopping a process pool

```TS
manager.stop(callback?: () => void): void
```

A `stop` call sends an exit signal to all runners in a pool and waits for their processes to exit, then executes a callback. Thus, a pool cannot be launched while stopping and vice versa.

After a pool is stopped, manager cannot pass new commands to it, like queueing or clearing scheduled operations.

When a pool is stopped, all scheduled operations queued within it will be disposed since processes are completely shut down and reference to a worker process disappears from task manager's internal stack. Therefore, all scheduled tasks and stored parameters will be gone forever, unless it was preserved by making a registry snapshot to store it for next launch. See next documentation page for detailed information about registry.

Stopping a pool will release runtime lock, so a main process can shut down due to no other jobs remaining, unless other asynchronous tasks are queued in an event loop or there is a pool restart planned during a stop callback call.

[Back to Main](https://github.com/zelbov/schedward/blob/main/doc/README.md) | [Next: Registry](https://github.com/zelbov/schedward/blob/main/doc/Registry.md)
