# Working with tasks

## TaskSchedule

```TS
manager.task(scheduleName: string): TaskSchedule
```

Despite a common interface to schedule tasks is a `TaskManager`, an actual timeout call is done through `TaskSchedule` that is pulled from manager by `task` call. This allows to separate scheduled tasks logically, while keeping them all organized and grouped by task type.

A schedule is a logical container for tasks. It inherits `EventEmitter` class with additional methods: `timeout` and `clear`.

### Pushing tasks into schedule

```TS
schedule.timeout(
    task_uid: string,
    timeout: number,
    params?: {[key: string]: any}
): void
```

This is an actual equivalent to `setTimeout` call, with two fundamental differences:

- Every scheduled operation should have it's own unique identifier assigned by application logic.
- A callback is not provided once per job. Instead, one or more callbacks can be provided through listening to `timeout` event to execute same job for all scheduled task triggered within the same task group.

```JS
// use instance of TaskManager with running pool
manager
// pull TaskSchedule named 'task'
.task('task')
// add a timeout job to a 'task' schedule
.timeout('my_unique_id', 1000) 
```

If two tasks are passed with same `task_uid`, previous one will be overwritten in a runner's internal state and will never trigger. This allows to restart the same task upon receiving according request, but if is not intended, consider assigning a unique `task_uid` for each scheduled task.

```JS
manager
.task('task')
.timeout('same_uid', 1000) // will not trigger

manager
.task('task')
.timeout('same_uid', 2000) // will trigger
```

Despite this method's internal functionality implies sending a signal to runner pool, this call is synchronous (fire-and-forget). An actual error handling during scheduled tasks triggering in a pool should be handled trough according `TaskManager` methods.

Unlike `setTimeout`'s approach to passing parameters into callback, `schedule.timeout` currently only accepts objects.

A `params` argument is used to pass additional data into runner's state and will be passed back to schedule's timeout event listener upon trigger.

```JS
manager
.task('task')
.timeout('withparams', 1000, { foo: 'bar' })
// ^ will produce timeout event: {..., params: { foo: 'bar' } }
// when triggered and captured by timeout listener
```

### Listening for scheduled tasks timeouts

```TS
schedule.addListener<DataType = {[key: string]: unknown}>(
    type: 'timeout',
    callback: (e: TimeoutResponse<DataType>) => void
): void
```

Every time a scheduled operation triggers upon timeout, it produces an artificial event that contains data from previously pushed task, such as `timeout`, `task_uid` and `params`

```TS
interface TimeoutResponse<ParamsType extends {[key: string]: any}> {
    task_uid: string,
    timeout: number,
    params?: ParamsType
}
```

There are multiple listeners allowed for the same task schedule. This would mean that every scheduled operation triggered will be processed multiple times by different task processors. However, a listener cannot be assigned to a single task triggered. This makes a task schedule rather multicast event producer for scheduled jobs (N listeners for each of any amount of jobs) instead of classical `setTimeout` unicast approach, when each job has it's own listener.

```JS
manager
.task('task')
.addListener('timeout', e => {
    console.log('First listener:', e)
})

manager
.task('task')
.addListener('timeout', e => {
    console.log('Second listener:', e)
})

manager
.task('task')
.timeout('mytask', 1000, { foo: 'bar' })
// ^ will trigger after 1s with the following output:
// > First listener: { task_uid: 'mytask', timeout: 1000, params: { foo: 'bar' } }
// > Second listener: { task_uid: 'mytask', timeout: 1000, params: { foo: 'bar' } }
```

### Clearing scheduled tasks

```TS
schedule.clear(
    task_uid: string
): void
```

A functional equivalent to `clearTimeout`. Example:

```JS
manager.task('task').timeout('nope', 1000)

manager.task('task').addListener('timeout', e => {

    if(e.task_uid == 'nope')
        console.log('It actually happened')
    // ^ will never happen since cancelled beforehand

})

// ... before it triggers
manager.task('task').clear('nope')

```

This allows to cancel current scheduled operation. A timeout handler will be cleared, and a task itself will disappear from all runners internal states, thus will not appear in task registry snapshots. It still allows pushing another task with same uid after that anyway.

Despite it sends a cancel signal to all runners in a pool, this call is synchronous (fire-and-forget). An actual error handling during scheduled tasks triggering in a pool should be handled trough according `TaskManager` methods.

[Prev: Registry](https://github.com/zelbov/schedward/blob/main/doc/Registry.md) | [Back to Main](https://github.com/zelbov/schedward/blob/main/doc/README.md) | [Next: Task runner and process pool](https://github.com/zelbov/schedward/blob/main/doc/Runner.md)
