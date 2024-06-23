import { TaskRunnerRegistryDump } from "../types/TaskRunner.types";
import { TaskManager } from "../manager/TasksManager";

export class TaskManagerAsync extends TaskManager {
    
    public async makeTaskRegistrySnapshot(): Promise<TaskRunnerRegistryDump> {
        
        return await new Promise(r => super.makeTaskRegistrySnapshot(r))

    }

}