// Incoming messags

export type TaskRunnerIncomingMessageType =
| 'timeout'
| 'stop'
| 'clear'
| 'dump'

export type TaskRunnerTimeoutMessageData<ParamsType extends Object> = { timeout: number, task_uid: string, task: string, params?: ParamsType }

export type TaskRunnerStopMessageData = { code: number }

export type TaskRunnerClearMessageData = { task_uid: string, task: string }

export type TaskRunnerDumpRequestData = {}

type TaskRunnerAnyIncomingMessage = 
| TaskRunnerTimeoutMessageData<{}>
| TaskRunnerStopMessageData
| TaskRunnerClearMessageData
| TaskRunnerDumpRequestData

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

export type TaskRunnerDumpResponseData = { registry: TaskRunnerRegistryDump }

type TaskRunnerAnyOutgoingMessage =
| TaskRunnerTimeoutMessageData<{}>
| TaskRunnerErrorMessageData
| TaskRunnerClearMessageData
| TaskRunnerDumpResponseData

export type TaskRunnerOutgoingMessage<
    DataType extends TaskRunnerAnyOutgoingMessage
> = { type: TaskRunnerOutgoingMessageType, data: DataType}

type RegistryEntry = { iat: number, timeout: number, params?: {[key: string]: unknown} }

type RegistryEntryWithHandler = RegistryEntry & { handler: NodeJS.Timeout }

export interface TaskRunnerRegistry {

    [task: string] : {

        [task_uid: string]: RegistryEntryWithHandler

    }

}

export interface TaskRunnerRegistryDump {


    [task: string]: {

        [task_uid: string]: RegistryEntry

    }

}