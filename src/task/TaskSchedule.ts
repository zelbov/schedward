import { EventEmitter } from "stream";
import { TimeoutCallHandler, TimeoutResponse, TimeoutClearResponse, TimeoutClearHandler } from "../types/TaskSchedule.types";


export declare interface TaskSchedule extends EventEmitter {

    emit(type: 'timeout', e: TimeoutResponse): boolean
    addListener(type: 'timeout', listener: (e: TimeoutResponse) => void): this

}

export class TaskSchedule extends EventEmitter {

    constructor(
        private timeoutCallHandler: TimeoutCallHandler,
        private timeoutClearHandler: TimeoutClearHandler,
        private taskName: string
    ){
        super()
    }

    timeout(task_uid: string, timeout: number) {

        this.timeoutCallHandler(task_uid, this.taskName, timeout)

    }

    async clear(task_uid: string) {

        this.timeoutClearHandler(task_uid, this.taskName)

    }

}