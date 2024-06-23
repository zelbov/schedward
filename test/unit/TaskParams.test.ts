import 'mocha'
import { expect } from 'chai'
import { TaskManager, TimeoutResponse } from 'schedward'

describe('TaskParams unit testing', () => {

    const manager = new TaskManager()

    before(async function(){

        manager.launch(8)
    
    })

    after(async function(){

        manager.stop()

    })

    it('Pass parameters object to scheduled task: should pass into runner and return a copy when triggers', async function(){

        manager.task('params').timeout('test', 20, { foo: 'bar' })

        const returnedParams : TimeoutResponse<{ foo: string }> = await new Promise((resolve) => {

            manager.task('params').addListener<{foo: string}>('timeout', (e) => {
                resolve(e)
            })

        })

        expect(returnedParams.params).not.undefined
        expect(returnedParams.params!.foo).eq('bar')

    })

})