

export type TimeoutCallHandler = <ParamsType extends Object>(task_uid: string, task: string, timeout: number, params?: ParamsType) => void

export type TimeoutClearHandler = (task_uid: string, task: string) => void

export type TimeoutResponse<ParamsType extends Object> = { task_uid: string, timeout: number, params?: ParamsType }

export type TimeoutClearResponse = { task_uid: string, timeout: number }