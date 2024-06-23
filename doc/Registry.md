# Registry

A registry is a deep copy of all data stored in a pool of task runners, composed into a single irresponsible object.
It has same format as a task runner's internal state, except for missing actual timeout handler reference:

```TS
interface RegistryEntry {
    iat: number,
    timeout: number,
    params?: {[key: string]: unknown}
}

// this is a snapshot that can be collected and reloaded by TaskManager
interface TaskRunnerRegistryDump {

    [task: string]: {

        [task_uid: string]: RegistryEntry

    }

}

// and this is an actual state that a task runner uses
interface TaskRunnerRegistry {

    [task: string] : {

        [task_uid: string]: RegistryEntry & { handler: NodeJS.Timeout }

    }

}
```

A [task manager](https://github.com/zelbov/schedward/blob/main/doc/Manager.md) can operate with a registry snapshot by loading them to distribute across runners pool, as well as collecting state snapshots of all runners and composing them into a single registry.

## Making registry snapshot (dump)

With callback:

```TS
manager.makeTaskRegistrySnapshot(
    callback: (registry: TaskRunnerRegistryDump) => void
): void
```

Async (from `schedward/async`):

```TS
manager.makeTaskRegistrySnapshot(): Promise<TaskRunnerRegistryDump>
```

Example:

```JS
manager.task('s1').timeout('t1', 1000)
manager.task('s2').timeout('t1', 1000)
manager.task('s2').timeout('t2', 1000)

manager.makeTaskRegistrySnapshot((reg) => console.log(reg))

/*

{
  s1: { t1: { iat: 1719154950837, timeout: 1000 } },
  s2: {
    t2: { iat: 1719154950837, timeout: 1000 },
    t1: { iat: 1719154950837, timeout: 1000 }
  }
}

*/

```

Every task entry in registry contains `timeout` property as one that was initially set and `iat` property which represents a timestamp of when an operation should be actually executed.

## Restoring schedules from registry snapshot

```TS
manager.loadTaskRegistry(registry: TaskRunnerRegistryDump)
```

This is a synchronous call. Same as normal [`timeout`](https://github.com/zelbov/schedward/blob/main/doc/Schedule.md) call, this is not accepted when pool is not running. Basically it decomposes a registry into singular tasks and passes them to runners pool in orderly fashion.

Important note: if a snapshot load is called while pool is processing other tasks, it might cause duplicate scheduled task triggers, since loading snapshot will not clear tasks currently scheduled within runners, since it does not keep the same order of tasks distribution among them.

Thus, coonsider re-initialization of a whole pool to clean up all running task schedules first.

A full cycle of dump & restore is the following:

```JS
manager.launch(8, () => {

    manager.task('s1').timeout('t1', 1000)
    manager.task('s2').timeout('t1', 1000)
    manager.task('s2').timeout('t2', 1000)

    manager.makeTaskRegistrySnapshot(reg => {

        manager.stop(() => {

            manager.launch(8, () => {

                manager.loadTaskRegistry(reg)

            })

        })

    })

})

```

Whenever a registry snapshot is loaded back into pool, all `timeout` values are overwritten as substracted `iat - new Date().getTime()`, and if it results in a negative number, it will be still scheduled in a pool for "immediate" execution (as if timeout value would be zero). Values of `iat` will be kept as they were.

This allows for delayed restoring of registry snapshots, e.g. when application restart takes a lot of time, or is down for a long time, so interval between dump & restore operation increases while application is down.

[Prev: Task manager](https://github.com/zelbov/schedward/blob/main/doc/Manager.md) | [Back to Main](https://github.com/zelbov/schedward/blob/main/doc/README.md) | [Next: Working with tasks](https://github.com/zelbov/schedward/blob/main/doc/Schedule.md)
