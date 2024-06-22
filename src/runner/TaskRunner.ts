import { TaskRunnerClearMessageData, TaskRunnerIncomingMessage, TaskRunnerOutgoingMessage, TaskRunnerRegistry, TaskRunnerStopMessageData, TaskRunnerTimeoutMessageData } from "src/types/TaskRunner.types"

export class TaskRunner {

    private _onShutdownCallbacks: ((statusCode: number) => void)[] = []
    private _registry: TaskRunnerRegistry

    constructor(){

        this._registry = {}
        this.initStopHandler()
        this.initTimeoutHandler()
        this.initClearHandler()

    }

    private initStopHandler(){

        process.on('message', (message: TaskRunnerIncomingMessage<TaskRunnerStopMessageData>, sendHandle) => {

            if(message.type != 'stop') return;

            process.removeAllListeners('message')
            this._onShutdownCallbacks.map(f => f(0))

        })

    }

    private initTimeoutHandler(){

        process.on('message', (message: TaskRunnerIncomingMessage<TaskRunnerTimeoutMessageData>) => {

            if(message.type != 'timeout') return;

            const { task_uid, timeout, task } = message.data,
                iat = new Date().getTime() + timeout

            if(!this._registry[task]) this._registry[task] = {}
            this._registry[task][task_uid] = {

                iat, timeout,
                handler: setTimeout(() => {

                    const response : TaskRunnerOutgoingMessage<TaskRunnerTimeoutMessageData> = {
                        type: 'timeout', data: { task_uid, timeout, task }
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

    onShutdown(callback: (statusCode: number) => void) {
        this._onShutdownCallbacks.push(callback)
    }

}