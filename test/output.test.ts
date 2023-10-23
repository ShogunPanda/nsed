/* eslint-disable @typescript-eslint/no-floating-promises */

import t from 'tap'
import { NSedError } from '../src/models.js'
import { handleError, showOutput } from '../src/output.js'

function createError(code: string, message: string = 'MESSAGE'): NSedError {
  const error = new NSedError(message)
  error.code = code
  return error
}

t.test('NSed output', t => {
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
      const errorCalls = t.capture(console, 'error')
      const processCalls = t.capture(process, 'exit')

      handleError(createError('ENSED', 'REASON'), 'FILE', true)
      t.equal(errorCalls()[0].args[0], 'REASON')
      t.equal(processCalls()[0].args[0], 1)

      handleError(createError('ENOENT', 'REASON'), 'FILE', true)
      t.equal(errorCalls()[0].args[0], 'Cannot open file FILE: file not found.')

      handleError(createError('EACCES', 'REASON'), 'FILE', true)
      t.equal(errorCalls()[0].args[0], 'Cannot open file FILE: permission denied.')

      t.throws(() => {
        handleError(new Error('ERROR'))
      }, new Error('ERROR'))

      t.end()
    })

    t.end()
  })

  t.test('.showOutput', t => {
    t.test('should return the right output', t => {
      const logCalls = t.capture(console, 'log')

      showOutput(undefined)
      showOutput(null)
      showOutput([1, 2])

      t.same(
        logCalls().map(m => m.args),
        [['<undefined>'], ['<null>'], ['1,2']]
      )

      t.end()
    })

    t.end()
  })

  t.end()
})
