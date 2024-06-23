import { join } from "path"
import cluster, { Worker } from 'cluster'
import { TaskSchedule } from "../task/TaskSchedule";
import { TaskRunnerClearMessageData, TaskRunnerDumpRequestData, TaskRunnerDumpResponseData, TaskRunnerIncomingMessage, TaskRunnerOutgoingMessage, TaskRunnerReadyResponseData, TaskRunnerRegistryDump, TaskRunnerTimeoutMessageData } from "src/types/TaskRunner.types";

const BOOTSTRAP_PATH = join(__dirname, '..', 'runner', 'bootstrap.js')

const IDLE_ERROR = 'Task manager is idle. Start a runners pool by using `launch()` method and wait for a callback'

export class TaskManager {

    private _runners: Worker[];
    private _current: number;
    private _schedules: {[name: string]: TaskSchedule };
    private _running: boolean

    constructor(){

        this._runners = []
        this._current = 0
        this._schedules = {}
        this._running = false

    }

    private handleTimeoutCall <ParamsType extends Object>(task_uid: string, task: string, timeout: number, params?: ParamsType) {

        if(!this._running) throw new Error(IDLE_ERROR)

        let workerIdx = this._current++
        if(this._current >= this._runners.length) this._current = 0;

        const worker = this._runners[workerIdx];

        if(!worker) throw new Error('Worker with idx #'+workerIdx+' does not exist in runners pool')
        
        let message : TaskRunnerIncomingMessage<TaskRunnerTimeoutMessageData<ParamsType>> | null = {
                type: 'timeout', data: {
                    task_uid, timeout, task, params
                }
            }

        worker.send(message)

        message = null

    }

    private handleTimeoutClearCall (task_uid: string, task: string) {

        if(!this._running) throw new Error(IDLE_ERROR)

        const message: TaskRunnerIncomingMessage<TaskRunnerClearMessageData> = {
            type: 'clear', data: { task_uid, task }
        }

        for(let runner of this._runners) runner.send(message)

    }

    public launch(concurrency: number, callback: () => void){

        if(concurrency <= 0) throw new Error('`concurrency` parameter must be a positive integer')

        if(this._running) throw new Error('TaskManager already running')

        cluster.setupPrimary({
            exec: BOOTSTRAP_PATH
        })

        for(let i = 0; i < concurrency; i++) {
            const runner = cluster.fork()
            this.initWorkerMessageHandlers(runner)
            this._runners.push(runner)
        }

        Promise.all(

            this._runners.map(runner => {

                return new Promise<void>((resolve) => {

                    runner.addListener('message', (msg: TaskRunnerOutgoingMessage<TaskRunnerReadyResponseData>) => {

                        if(msg.type != 'ready') return;
    
                        resolve()
    
                    })

                })

            })
        ).then(() => {

            this._running = true
            if(callback) callback()

        })

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

    public stop(callback?: () => void) {

        if(!this._running) {
            if(callback) callback()
            return;
        }

        Promise.all(this._runners.map(runner => {

            return new Promise<void>((resolve) => {

                if(runner.isDead()) return resolve()
                runner.send({ type: 'stop', data: {} })
                //TODO: listen for errors and pass into callback
                runner.addListener('exit', () => resolve())

            })

        })).then(() => {

            this._runners = []
            this._running = false
            if(callback) callback()

        })

    }

    public loadTaskRegistry(registry: TaskRunnerRegistryDump) {

        if(!this._running) throw new Error(IDLE_ERROR)

        Object.keys(registry).map(task => {

            Object.keys(registry[task]).map(task_uid => {

                const { iat, params } = registry[task][task_uid],
                    now = new Date().getTime(),
                    timeout = now >= iat ? 0 : iat - now

                this.task(task).timeout(task_uid, timeout, params)

            })

        })

    }

    public makeTaskRegistrySnapshot(callback: (snapshot: TaskRunnerRegistryDump) => void) {

        if(!this._running) throw new Error(IDLE_ERROR)

        const cache : TaskRunnerRegistryDump = {}

        Promise.all(
            this._runners.map(runner => {

                const request : TaskRunnerIncomingMessage<TaskRunnerDumpRequestData> = { type: 'dump', data: {} }

                runner.send(request)

                return new Promise<void>((resolve) => {

                    runner.addListener('message', (message: TaskRunnerOutgoingMessage<TaskRunnerDumpResponseData>) => {

                        if(message.type != 'dump') return;

                        const chunk = message.data.registry

                        Object.keys(chunk).map(task => {

                            if(!cache[task]) cache[task] = {}

                            Object.keys(chunk[task]).map(task_uid => {

                                cache[task][task_uid] = chunk[task][task_uid]

                            })

                        })

                        resolve()

                    })

                })

            })
        ).then(() => callback(cache))

    }

    ///

    public get numWorkers() { return this._runners.length }
    public get running() { return this._running }
    public get taskList() { return Object.keys(this._schedules) }

}