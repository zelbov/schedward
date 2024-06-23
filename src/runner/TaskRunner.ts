import { TaskRunnerClearMessageData, TaskRunnerDumpRequestData, TaskRunnerDumpResponseData, TaskRunnerIncomingMessage, TaskRunnerOutgoingMessage, TaskRunnerReadyResponseData, TaskRunnerRegistry, TaskRunnerRegistryDump, TaskRunnerStopMessageData, TaskRunnerTimeoutMessageData } from "src/types/TaskRunner.types"

export class TaskRunner {

    private _onShutdownCallbacks: ((statusCode: number) => void)[] = []
    private _registry: TaskRunnerRegistry

    constructor(){

        this._registry = {}
        this.initStopHandler()
        this.initTimeoutHandler()
        this.initClearHandler()
        this.initDumpRequestHandler()
        
        const ready : TaskRunnerOutgoingMessage<TaskRunnerReadyResponseData> = {
            type: 'ready', data: {}
        }
        process && process.send && process.send(ready)

    }

    private initStopHandler(){

        process.on('message', (message: TaskRunnerIncomingMessage<TaskRunnerStopMessageData>) => {

            if(message.type != 'stop') return;

            process.removeAllListeners('message')
            this._onShutdownCallbacks.map(f => f(message.data.code || 0))

        })

    }

    private initTimeoutHandler(){

        process.on('message', (message: TaskRunnerIncomingMessage<TaskRunnerTimeoutMessageData<{}>>) => {

            if(message.type != 'timeout') return;

            const { task_uid, timeout, task, params } = message.data,
                iat = new Date().getTime() + timeout

            if(!this._registry[task]) this._registry[task] = {}

            if(this._registry[task][task_uid])
                clearTimeout(this._registry[task][task_uid].handler)
            
            this._registry[task][task_uid] = {

                iat, timeout, params,
                handler: setTimeout(() => {

                    const response : TaskRunnerOutgoingMessage<TaskRunnerTimeoutMessageData<{}>> = {
                        type: 'timeout', data: { task_uid, timeout, task, params }
                    }
                    
                    process && process.send && process.send(response)
                    delete this._registry[task][task_uid]
    
                }, timeout)

            }

        })

    }

    private initClearHandler() {

        process.on('message', (message: TaskRunnerIncomingMessage<TaskRunnerClearMessageData>) => {

            if(message.type != 'clear') return;

            const { task_uid, task } = message.data

            if(!this._registry[task]) return;
            if(!this._registry[task][task_uid]) return;

            clearTimeout(this._registry[task][task_uid].handler)
            delete this._registry[task][task_uid]

        })

    }

    private initDumpRequestHandler() {

        process.on('message', (message: TaskRunnerIncomingMessage<TaskRunnerDumpRequestData>) => {

            if(message.type != 'dump') return;

            const registry : TaskRunnerRegistryDump = {}

            Object.keys(this._registry).map(task => {

                registry[task] = {}

                Object.keys(this._registry[task]).map(task_uid => {

                    const { iat, params, timeout } = this._registry[task][task_uid]

                    registry[task][task_uid] = { iat, params, timeout }

                })

            })

            const response : TaskRunnerOutgoingMessage<TaskRunnerDumpResponseData> = { type: 'dump', data: { registry } }

            process && process.send && process.send(response)

        })

    }

    onShutdown(callback: (statusCode: number) => void) {
        this._onShutdownCallbacks.push(callback)
    }

}