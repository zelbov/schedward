// Incoming messags

export type TaskRunnerIncomingMessageType =
| 'timeout'
| 'stop'
| 'clear'
| 'dump'

export type TaskRunnerTimeoutMessageData<ParamsType extends Object> = { timeout: number, task_uid: string, task: string, params?: ParamsType }

export type TaskRunnerStopMessageData = { code: number }

export type TaskRunnerClearMessageData = { task_uid: string, task: string }

export type TaskRunnerDumpMessageData = {}

type TaskRunnerAnyIncomingMessage = 
| TaskRunnerTimeoutMessageData<{}>
| TaskRunnerStopMessageData
| TaskRunnerClearMessageData
| TaskRunnerDumpMessageData

export type TaskRunnerIncomingMessage<
    DataType extends TaskRunnerAnyIncomingMessage
> = { type: TaskRunnerIncomingMessageType, data: DataType }

// Outgoing messages

export type TaskRunnerOutgoingMessageType =
| 'timeout'
| 'clear'
| 'dump'
| 'error'

export type TaskRunnerErrorMessageData = { error: string, task_uid?: string, task?: string }

type TaskRunnerAnyOutgoingMessage =
| TaskRunnerTimeoutMessageData<{}>
| TaskRunnerErrorMessageData
| TaskRunnerClearMessageData
| TaskRunnerDumpMessageData

export type TaskRunnerOutgoingMessage<
    DataType extends TaskRunnerAnyOutgoingMessage
> = { type: TaskRunnerOutgoingMessageType, data: DataType}

export interface TaskRunnerRegistry {

    [task: string] : {

        [task_uid: string]: { handler: NodeJS.Timeout, iat: number, timeout: number, params?: Object }

    }

}