# Schedward

A simple to use scheduled task manager for highloaded Node apps.

## Preamble

High load on back-end applications and `setTimeout` do not mix quite well, especially when it comes to scheduled processing of large amounts of data within frequent user requests, and here's why:

- Whenever `setTimeout` callback uses reference to an object defined outside its execution scope, it keeps this object from being garbage collected during whole wait time for a scheduled callback to execute. This leads to data being stored in heap for much longer than it is supposed to, and every time a garbage collection triggers, it will have harder time iterating through needless references across multiple runs. Combine that with a fact that V8's GC halts a runtime until it finishes it's job, and you'll have your application throttling.

- Async is not threads. `setTimeout` queues a callback execution in event loop's task queue. Event loop is processed every time a current synchronous code execution completes, thus making queued calls consecutively synchronous. Frequent `setTimeout` calls triggered by user request in a high loaded application cause event loop pollution.

- If a callback is passed as a closure defined straight away instead of a single callback function definition somewhere outside `setTimeout` call, this might also pollute the heap and block execution during JIT compilation of a closure.

All of these problems can be handled with a proper approach to scheduled operations implementation, of course. Sometimes, though not necessarily, it also implies using additional boilerplate code as a solution.

This package offers rather universal solution to reduce that boilerplate, avoid mistakes and optimize scheduled tasks queue processing.

## Features

- Distribution of scheduled tasks across a process pool, allowing to scale up a number of event loops and garbage collectors operating with task queues in parallel and balance the load

- Segregation of scheduled tasks queues from application main process, allowing to unload it from continuous, excessive and intensive event loop processing and garbage collection

- Dereferencing of objects passed as callback parameters from outside callback execution scope by making their deep copies and storing them in a pooled process heap instead

- Failover hooks for storing and redistributing task registries across runners pool upon application restart

- Separation of tasks according to scheduled operation logical purpose

- Stateless, isolated scheduled task callbacks

## Installation

### npm

`npm i -S schedward`

## Basic usage

```JS

import { TaskManager } from 'schedward'

const manager = new TaskManager(),
    concurrency = 1 // number of task runners in a pool

// launch a pool of task runners for an instance of task manager
manager.launch(concurrency)

manager
    // pull a task schedule
    .task('mytask')
    // add a callback for all tasks triggered within a schedule
    .addListener('timeout', ({ task_uid }) => {

        // use task_uid as a unique identifier
        // can also represent a parameters set composed into a string
        console.log('Task', task_uid, 'executed')

    })

manager.task('mytask').timeout('newtask', 1000)
manager.task('mytask').timeout('anothertask', 2000)

// (after 1000ms passed): 
// -> Task newtask executed

// (after another 1000ms passed): 
// -> Task anothertask executed

```

## Documentation

For extended usage examples and instructions please refer to [full documentation page](https://github.com/zelbov/schedward/blob/main/doc/README.md) on GitHub.

## Important note

This package is not meant to handle actual scheduled operation code execution using separate process pool's resources. It only allows to optimize queued tasks processing in an event loop for monolith back-end applications.

This may or may not be a subject to change in a future though ;)

If you need to improve your computing power utilization for compute-intensive operations, consider referring to Node's built-in [`cluster`](https://nodejs.org/api/cluster.html) module to develop your own solution for that.

You might also need to look in a direction of horizontal system scaling solutions for your application, e.g. microservice architecture, or delegate your compute-intensive code to [native addons](https://nodejs.org/api/addons.html).

## TBD

Future versions of this package are planned to provide additional features:

- Handle crash events and errors in a task runners pool
- Benchmarking and GC tracing
- Extended documentation
