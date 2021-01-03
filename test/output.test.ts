/* eslint-disable @typescript-eslint/no-floating-promises */

import { SinonSpyCall, stub } from 'sinon'
import t from 'tap'
import { NSedError } from '../src/models'
import { handleError, showOutput } from '../src/output'

type Test = typeof t

function createError(code: string, message: string = 'MESSAGE'): NSedError {
  const error = new NSedError(message)
  error.code = code
  return error
}

t.test('NSed output', (t: Test) => {
  const logStub = stub(console, 'log')
  const errorStub = stub(console, 'error')
  const processStub = stub(process, 'exit')

  t.tearDown(() => {
    logStub.restore()
    errorStub.restore()
    processStub.restore()
  })

  t.test('NSedError', (t: Test) => {
    t.test('should set the right code', (t: Test) => {
      const error = new NSedError('REASON')
      t.equal(error.message, 'REASON')
      t.equal(error.code, 'ENSED')

      t.end()
    })

    t.end()
  })

  t.test('.handleError', (t: Test) => {
    t.test('should correctly handle errors', (t: Test) => {
      errorStub.reset()
      processStub.reset()

      handleError(createError('ENSED', 'REASON'), 'FILE', true)
      t.equal(errorStub.firstCall.args[0], 'REASON')
      t.equal(processStub.firstCall.args[0], 1)

      errorStub.reset()
      handleError(createError('ENOENT', 'REASON'), 'FILE', true)
      t.equal(errorStub.firstCall.args[0], 'Cannot open file FILE: file not found.')

      errorStub.reset()
      handleError(createError('EACCES', 'REASON'), 'FILE', true)
      t.equal(errorStub.firstCall.args[0], 'Cannot open file FILE: permission denied.')

      t.throw(() => handleError(new Error('ERROR')), new Error('ERROR'))

      t.end()
    })

    t.end()
  })

  t.test('.showOutput', (t: Test) => {
    t.test('should return the right output', (t: Test) => {
      showOutput(undefined) // eslint-disable-line no-undefined
      showOutput(null)
      showOutput([1, 2])

      t.same(
        logStub.getCalls().map((m: SinonSpyCall) => m.args),
        [['<undefined>'], ['<null>'], ['1,2']]
      )

      t.end()
    })

    t.end()
  })

  t.end()
})
