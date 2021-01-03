/* eslint-disable @typescript-eslint/no-floating-promises */

import { resolve } from 'path'
import { stub } from 'sinon'
import t from 'tap'
import { NSedError } from '../src/models'
import { executeCommands, parseCommand, requireModule } from '../src/operations'

type Test = typeof t

t.test('NSed operations', (t: Test) => {
  const logStub = stub(console, 'log')
  const errorStub = stub(console, 'error')
  requireModule('crypto')

  t.tearDown(() => {
    logStub.restore()
    errorStub.restore()
  })

  t.test('parseCommand', (t: Test) => {
    t.test('should return the right command', (t: Test) => {
      t.same(parseCommand('command', '.foo'), {
        type: 'command',
        command: '$data.foo'
      })

      t.same(parseCommand('command', '[2]'), {
        type: 'command',
        command: '$data[2]'
      })

      t.same(parseCommand('command', '[whatever]'), {
        type: 'command',
        command: '$data[whatever]'
      })

      t.same(parseCommand('command', '/^\\d/'), {
        type: 'command',
        command: '$data.toString().match(/^\\d/)'
      })

      t.same(parseCommand('command', '$1'), {
        type: 'command',
        command: 'RegExp.$1'
      })

      t.same(parseCommand('command', 'foo'), {
        type: 'command',
        command: 'foo'
      })

      t.same(parseCommand('filter', '$1'), {
        type: 'filter',
        command: 'RegExp.$1'
      })

      t.same(parseCommand('reverseFilter', '$1'), {
        type: 'reverseFilter',
        command: 'RegExp.$1'
      })

      const imported = parseCommand('function', resolve(__dirname, 'fixtures/function.js'))
      t.equal(imported.type, 'function')
      t.type(imported.command, Function)

      t.throw(() => parseCommand('function', __filename), new NSedError(`File "${__filename}" must export a function.`))

      t.throw(() => parseCommand('function', '/foo'), new NSedError('Cannot require file "/foo".'))

      t.end()
    })

    t.end()
  })

  t.test('.requireModule', (t: Test) => {
    t.test('should require a module and make it available in the global scope', (t: Test) => {
      t.type((global as any).stringDecoder, 'undefined')
      requireModule('string_decoder')
      t.type((global as any).stringDecoder, 'object')

      t.throw(() => requireModule('foo'), new NSedError('Cannot find module "foo".'))

      t.end()
    })

    t.end()
  })

  t.test('.executeCommand', (t: Test) => {
    t.test('should correctly execute commands', async (t: Test) => {
      logStub.reset()

      await executeCommands('abc', 0, [
        { type: 'command', command: '$data[1]' },
        { type: 'command', command: '$data + $index' }
      ])

      t.equal(logStub.firstCall.args[0], 'b0')
    })

    t.test('should correctly execute functions', async (t: Test) => {
      logStub.reset()

      await executeCommands('abc', 0, [
        { type: 'function', command: ($data: string) => $data[1] },
        { type: 'command', command: '$data + $index' }
      ])

      t.equal(logStub.firstCall.args[0], 'b0')
    })

    t.test('should correctly handle filters', async (t: Test) => {
      logStub.reset()

      await executeCommands('abc', 1, [{ type: 'filter', command: '$index < 2' }])
      t.equal(logStub.firstCall.args[0], 'abc')

      logStub.reset()
      await executeCommands('abc', 3, [{ type: 'filter', command: '$index < 2' }])
      t.equal(logStub.callCount, 0)
    })

    t.test('should correctly handle reverse filters', async (t: Test) => {
      logStub.reset()

      await executeCommands('abc', 1, [{ type: 'reverseFilter', command: '$index < 2' }])
      t.equal(logStub.callCount, 0)

      await executeCommands('abc', 3, [{ type: 'reverseFilter', command: '$index < 2' }])
      t.equal(logStub.firstCall.args[0], 'abc')
    })

    t.test('should handle errors', async (t: Test) => {
      errorStub.reset()

      t.rejects(
        executeCommands('abc', 1, [{ type: 'command', command: '$data()' }]),
        new NSedError('Invalid command "$data()": [TypeError] $data is not a function.')
      )
    })

    t.end()
  })

  t.end()
})
