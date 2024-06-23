import 'mocha'
import { expect } from 'chai'
import { TaskManager } from 'schedward'

describe('TaskManager unit tests', () => {

    describe('Bootstrap & shutdown tests', () => {

        const mgr = new TaskManager()

        after(async function() {

            await new Promise<void>(r => mgr.stop(r))

        })

        it('Launch task runners pool through task manager: should succeed', async function() {

            await new Promise<void>(r => mgr.launch(8, r))

            expect(mgr.numWorkers).eq(8)

        })

    })

    describe('Timeout schedule tests', () => {

        const mgr = new TaskManager()

        before(async function() {
            await new Promise<void>(r => mgr.launch(8, r))
        })

        after(async function() {
            await new Promise<void>(r => mgr.stop(r))
        })

        it('Schedule short period timeout: should succeed & trigger according event', async function() {

            mgr.task('new').timeout('1', 50)

            await new Promise((resolve) => {
                mgr.task('new').addListener('timeout', resolve)
            })

        })

        it('Schedule timeout & cancel: should not run callback', async function(){

            // set another timeout to trigger after 50ms
            mgr.task('cancel').timeout('1', 50)

            await new Promise((resolve, reject) => {
                
                // clear after 20ms
                setTimeout(() => mgr.task('cancel').clear('1'), 20)

                // this should never happen
                mgr.task('cancel').addListener('timeout', reject)

                // this should happen
                setTimeout(resolve, 100)

            })

        })

    })

})