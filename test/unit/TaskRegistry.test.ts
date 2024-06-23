import 'mocha'
import { expect } from 'chai'
import { TaskManager, TaskRunnerRegistryDump, TimeoutResponse } from 'schedward'

describe('TaskRegistry unit tests', () => {

    describe('Arbitrary registry load & launch', () => {

        const manager = new TaskManager()

        before(async function(){

            manager.launch(8)

        })

        after(async function(){

            manager.stop()

        })

        it('Load task registry dump: should spread & execute tasks', async function() {

            const reg : TaskRunnerRegistryDump = {

                'dumped': {

                    'task1': { iat: new Date().getTime() + 100, timeout: 100, params: { foo: 'bar' } }

                }

            }

            manager.loadTaskRegistry(reg)

            const response = await new Promise<TimeoutResponse<{ foo: string }>>(r => 
                manager.task('dumped').addListener<{ foo: string }>('timeout', r)
            )

            expect(response).not.undefined

            expect(response.task_uid).eq('task1')
            expect(response.timeout).lessThanOrEqual(100)
            expect(response.params).not.undefined
            expect(response.params!.foo).eq('bar')

        })

    })

    describe('Registry dumping', () => {

        const manager = new TaskManager()

        before(async function(){

            manager.launch(8)

        })

        after(async function(){

            manager.stop()

        })

        it('Collect registry dumps from all workers: should return a consistent registry', async function() {

            manager.task('dump').timeout('task1', 50)
            manager.task('dump').timeout('task2', 60, { foo: 'bar' })
            manager.task('dump2').timeout('task1', 70)

            const snapshot : TaskRunnerRegistryDump = await new Promise(r => manager.makeTaskRegistrySnapshot(r))

            expect(snapshot).not.undefined
            expect(snapshot.dump).not.undefined
            expect(snapshot.dump.task1).not.undefined
            expect(snapshot.dump.task2).not.undefined
            expect(snapshot.dump2.task1).not.undefined

            expect(snapshot.dump.task1.iat).not.undefined
            expect(snapshot.dump.task2.params).not.undefined
            expect(snapshot.dump.task2.params!.foo).eq('bar')

        })

    })

    describe('Full registry dump & reload cycle', () => {

        const manager = new TaskManager()

        before(async function(){

            manager.launch(8)

        })

        after(async function(){

            manager.stop()

        })

        let snap: TaskRunnerRegistryDump

        it('Pass tasks & snapshoot: should produce consistent snapshot', async function() {

            manager.task('snap').timeout('task1', 50)
            manager.task('snap').timeout('task2', 50, { foo: 'bar' })

            await new Promise<void>((resolve) => manager.makeTaskRegistrySnapshot(response => {

                snap = response
                manager.stop()
                resolve()

            }))

        })


        it('Restart manager and reload tasks snapshot: should execute all tasks', async function() {

            manager.launch(8)

            manager.loadTaskRegistry(snap)

            await Promise.all(

                ['task1', 'task2'].map(uid => {

                    return new Promise<void>((resolve) => {

                        manager.task('snap').addListener('timeout', ({ task_uid }) => {
    
                            if(task_uid == uid) resolve()
    
                        })
    
                    })

                })
                
            )

        })

    })

})