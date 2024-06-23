import { TaskRunnerRegistryDump } from "../types/TaskRunner.types";
import { TaskManager } from "../manager/TasksManager";

export class TaskManagerAsync extends TaskManager {
    
    public async makeTaskRegistrySnapshot(): Promise<TaskRunnerRegistryDump> {
        
        return await new Promise(r => super.makeTaskRegistrySnapshot(r))

    }

    public async launch(concurrency: number){

        return await new Promise<void>((resolve) => super.launch(concurrency, () => resolve()))

    }

    public async stop() {

        return await new Promise<void>((resolve) => super.stop(() => resolve()))

    }

}