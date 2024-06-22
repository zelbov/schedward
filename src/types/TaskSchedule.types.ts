

export type TimeoutCallHandler = (task_uid: string, task: string, timeout: number) => void

export type TimeoutClearHandler = (task_uid: string, task: string) => void

export type TimeoutResponse = { task_uid: string, timeout: number }

export type TimeoutClearResponse = { task_uid: string, timeout: number }