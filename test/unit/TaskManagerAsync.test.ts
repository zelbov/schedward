import 'mocha'
import { expect } from 'chai'
import { TaskManager } from 'schedward/async'

describe('TaskManagerAsync unit tests', () => {

    const manager = new TaskManager()

    before(async function(){

        await manager.launch(8)

    })

    after(async function() {

        await manager.stop()
        
    })

    it('Push tasks to async manager & dump: should return snapshot asynchronously', async function(){

        manager.task('async').timeout('task1', 50)
        manager.task('async').timeout('task2', 50)

        const dump = await manager.makeTaskRegistrySnapshot()

        expect(dump).not.undefined
        expect(dump.async).not.undefined
        expect(dump.async.task1).not.undefined
        expect(dump.async.task2).not.undefined
        

    })

})