import { deepStrictEqual, throws } from 'node:assert'
import { test } from 'node:test'
import { NSedError } from '../src/models.ts'
import { handleError, showOutput } from '../src/output.ts'

function createError(code: string, message: string = 'MESSAGE'): NSedError {
  const error = new NSedError(message)
  error.code = code
  return error
}

test('NSed output', async () => {
  await test('NSedError', async () => {
    await test('should set the right code', () => {
      const error = new NSedError('REASON')
      deepStrictEqual(error.message, 'REASON')
      deepStrictEqual(error.code, 'ENSED')
    })
  })

  await test('.handleError', async () => {
    await test('should correctly handle errors', t => {
      const consoleError = t.mock.method(console, 'error')
      const processExit = t.mock.method(process, 'exit')

      consoleError.mock.mockImplementation(() => {})
      processExit.mock.mockImplementation(() => {})

      handleError(createError('ENSED', 'REASON'), 'FILE', true)
      deepStrictEqual(consoleError.mock.calls[0].arguments[0], 'REASON')
      deepStrictEqual(processExit.mock.calls[0].arguments[0], 1)

      consoleError.mock.resetCalls()
      handleError(createError('ENOENT', 'REASON'), 'FILE', true)
      deepStrictEqual(consoleError.mock.calls[0].arguments[0], 'Cannot open file FILE: file not found.')

      consoleError.mock.resetCalls()
      handleError(createError('EACCES', 'REASON'), 'FILE', true)
      deepStrictEqual(consoleError.mock.calls[0].arguments[0], 'Cannot open file FILE: permission denied.')

      throws(() => {
        handleError(new Error('ERROR'))
      }, new Error('ERROR'))
    })
  })

  await test('.showOutput', async () => {
    await test('should return the right output', t => {
      const consoleLog = t.mock.method(console, 'log')
      consoleLog.mock.mockImplementation(() => {})

      showOutput(undefined)
      showOutput(null)
      showOutput([1, 2])

      deepStrictEqual(
        consoleLog.mock.calls.map(m => m.arguments),
        [['<undefined>'], ['<null>'], ['1,2']]
      )
    })
  })
})
