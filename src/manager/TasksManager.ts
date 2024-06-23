import { join } from "path"
import cluster, { Worker } from 'cluster'
import { TaskSchedule } from "../task/TaskSchedule";
import { TaskRunnerClearMessageData, TaskRunnerIncomingMessage, TaskRunnerOutgoingMessage, TaskRunnerTimeoutMessageData } from "src/types/TaskRunner.types";

export class TaskManager {

    private _runners: Worker[] = [];
    private _current: number = 0;
    private _schedules: {[name: string]: TaskSchedule } = {};
    private _running: boolean = true

    private handleTimeoutCall <ParamsType extends Object>(task_uid: string, task: string, timeout: number, params?: ParamsType) {

        if(!this._runners.length) throw new Error('No task runners in pool. Perhaps you forgot to call `TaskManager.launch()` first?')

        let workerIdx = this._current++
        if(this._current >= this._runners.length) this._current = 0;

        const worker = this._runners[workerIdx],
            message : TaskRunnerIncomingMessage<TaskRunnerTimeoutMessageData<ParamsType>> = {
                type: 'timeout', data: {
                    task_uid, timeout, task,
                    // make a deep copy of passed params object
                    params: params ? JSON.parse(JSON.stringify(params)) : undefined
                }
            }

        if(!worker) throw new Error('Worker with idx #'+workerIdx+' does not exist in runners pool')

        worker.send(message)

    }

    private handleTimeoutClearCall (task_uid: string, task: string) {

        const message: TaskRunnerIncomingMessage<TaskRunnerClearMessageData> = {
            type: 'clear', data: { task_uid, task }
        }

        for(let runner of this._runners) runner.send(message)

    }

    public launch(concurrency: number){

        const bootstrapPath = join(__dirname, '..', 'runner', 'bootstrap.js')

        cluster.setupPrimary({
            exec: bootstrapPath
        })

        for(let i = 0; i < concurrency; i++) {
            const runner = cluster.fork()
            this.initWorkerMessageHandlers(runner)
            this._runners.push(runner)
        }

    }

    private initWorkerMessageHandlers(worker: Worker) {

        this.initWorkerTimeoutHandler(worker)

    }

    private initWorkerTimeoutHandler(worker: Worker){

        worker.on('message', (message: TaskRunnerOutgoingMessage<TaskRunnerTimeoutMessageData<{}>>) => {

            if(message.type != 'timeout') return;

            const { task, task_uid, timeout, params } = message.data

            let schedule = this._schedules[task]

            if(!schedule) schedule = this._schedules[task] = new TaskSchedule(
                this.handleTimeoutCall.bind(this),
                this.handleTimeoutClearCall.bind(this),
                task
            )

            schedule.emit('timeout', { task_uid, timeout, params })

        })

    }

    private initWorkerErrorHandlers(){

        //TODO: implement

    }

    public task(name: string){

        if(!this._schedules[name])
            this._schedules[name] = new TaskSchedule(
                this.handleTimeoutCall.bind(this),
                this.handleTimeoutClearCall.bind(this),
                name
            )
        return this._schedules[name]

    }

    public stop() {

        this._running = false
        for(let runner of this._runners) {
            if(!runner.isDead()) runner.send({ type: 'stop', data: {} })
        }

    }

    ///

    public get numWorkers() { return this._runners.length }
    public get running() { return this._running }

}