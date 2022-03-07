/* eslint-disable @typescript-eslint/no-floating-promises */

import sinon from 'sinon'
import t from 'tap'
import { NSedError } from '../src/models.js'
import { handleError, showOutput } from '../src/output.js'

function createError(code: string, message: string = 'MESSAGE'): NSedError {
  const error = new NSedError(message)
  error.code = code
  return error
}

t.test('NSed output', t => {
  const logStub = sinon.stub(console, 'log')
  const errorStub = sinon.stub(console, 'error')
  const processStub = sinon.stub(process, 'exit')

  t.teardown(() => {
    logStub.restore()
    errorStub.restore()
    processStub.restore()
  })

  t.test('NSedError', t => {
    t.test('should set the right code', t => {
      const error = new NSedError('REASON')
      t.equal(error.message, 'REASON')
      t.equal(error.code, 'ENSED')

      t.end()
    })

    t.end()
  })

  t.test('.handleError', t => {
    t.test('should correctly handle errors', t => {
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

      t.throws(() => handleError(new Error('ERROR')), new Error('ERROR'))

      t.end()
    })

    t.end()
  })

  t.test('.showOutput', t => {
    t.test('should return the right output', t => {
      showOutput(undefined)
      showOutput(null)
      showOutput([1, 2])

      t.same(
        logStub.getCalls().map(m => m.args),
        [['<undefined>'], ['<null>'], ['1,2']]
      )

      t.end()
    })

    t.end()
  })

  t.end()
})
