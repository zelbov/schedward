import { EventEmitter } from "stream";
import { TimeoutCallHandler, TimeoutResponse, TimeoutClearHandler } from "../types/TaskSchedule.types";


export declare interface TaskSchedule extends EventEmitter {

    emit<ParamsType extends Object>(type: 'timeout', e: TimeoutResponse<ParamsType>): boolean
    addListener<ParamsType extends Object = {[key: string]: any}>(type: 'timeout', listener: (e: TimeoutResponse<ParamsType>) => void): this

}

export class TaskSchedule extends EventEmitter {

    constructor(
        private timeoutCallHandler: TimeoutCallHandler,
        private timeoutClearHandler: TimeoutClearHandler,
        private taskName: string
    ){
        super()
    }

    timeout<ParamsType extends Object>(task_uid: string, timeout: number, params?: ParamsType) {

        if(params) params = JSON.parse(JSON.stringify(params))

        this.timeoutCallHandler(task_uid, this.taskName, timeout, params)

    }

    clear(task_uid: string) {

        this.timeoutClearHandler(task_uid, this.taskName)

    }

}