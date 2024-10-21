import { deepStrictEqual, rejects } from 'node:assert'
import { test } from 'node:test'
import { NSedError } from '../src/models.js'
import { executeCommands, parseCommand, requireModule } from '../src/operations.js'

test('NSed operations', async () => {
  requireModule('crypto')

  await test('parseCommand', async () => {
    await test('should return the right command', async () => {
      deepStrictEqual(await parseCommand('command', '.foo'), {
        type: 'command',
        command: '$data.foo'
      })

      deepStrictEqual(await parseCommand('command', '[2]'), {
        type: 'command',
        command: '$data[2]'
      })

      deepStrictEqual(await parseCommand('command', '[whatever]'), {
        type: 'command',
        command: '$data[whatever]'
      })

      deepStrictEqual(await parseCommand('command', '/^\\d/'), {
        type: 'command',
        command: '$data.toString().match(/^\\d/)'
      })

      deepStrictEqual(await parseCommand('command', '$1'), {
        type: 'command',
        command: 'RegExp.$1'
      })

      deepStrictEqual(await parseCommand('command', 'foo'), {
        type: 'command',
        command: 'foo'
      })

      deepStrictEqual(await parseCommand('filter', '$1'), {
        type: 'filter',
        command: 'RegExp.$1'
      })

      deepStrictEqual(await parseCommand('reverseFilter', '$1'), {
        type: 'reverseFilter',
        command: 'RegExp.$1'
      })

      const fileName = import.meta.url.toString().replace('file://', '')
      const imported = await parseCommand(
        'function',
        new URL('fixtures/function.cjs', import.meta.url).toString().replace('file://', '')
      )
      deepStrictEqual(imported.type, 'function')
      deepStrictEqual(typeof imported.command, 'function')

      rejects(parseCommand('function', fileName), new NSedError(`File "${fileName}" must export a function.`))

      rejects(parseCommand('function', '/foo'), new NSedError('Cannot require file "/foo".'))
    })
  })

  await test('.requireModule', async () => {
    await test('should require a module and make it available in the global scope', async () => {
      deepStrictEqual(typeof (globalThis as any).stringDecoder, 'undefined')
      await requireModule('string_decoder')
      deepStrictEqual(typeof (globalThis as any).stringDecoder, 'object')

      rejects(requireModule('foo'), new NSedError('Cannot find module "foo".'))
    })
  })

  await test('.executeCommand', async () => {
    await test('should correctly execute commands', async t => {
      const consoleLog = t.mock.method(console, 'log')
      consoleLog.mock.mockImplementation(() => {})

      await executeCommands('abc', 0, [
        { type: 'command', command: '$data[1]' },
        { type: 'command', command: '$data + $index' }
      ])

      deepStrictEqual(consoleLog.mock.calls[0].arguments[0], 'b0')
    })

    await test('should correctly execute functions', async t => {
      const consoleLog = t.mock.method(console, 'log')
      consoleLog.mock.mockImplementation(() => {})

      await executeCommands('abc', 0, [
        { type: 'function', command: $data => $data[1] },
        { type: 'command', command: '$data + $index' }
      ])

      deepStrictEqual(consoleLog.mock.calls[0].arguments[0], 'b0')
    })

    await test('should correctly handle filters', async t => {
      const consoleLog = t.mock.method(console, 'log')
      consoleLog.mock.mockImplementation(() => {})

      await executeCommands('abc', 1, [{ type: 'filter', command: '$index < 2' }])
      deepStrictEqual(consoleLog.mock.calls[0].arguments[0], 'abc')

      consoleLog.mock.resetCalls()
      await executeCommands('abc', 3, [{ type: 'filter', command: '$index < 2' }])
      deepStrictEqual(consoleLog.mock.callCount(), 0)
    })

    await test('should correctly handle reverse filters', async t => {
      const consoleLog = t.mock.method(console, 'log')
      consoleLog.mock.mockImplementation(() => {})

      await executeCommands('abc', 1, [{ type: 'reverseFilter', command: '$index < 2' }])
      deepStrictEqual(consoleLog.mock.callCount(), 0)

      consoleLog.mock.resetCalls()
      await executeCommands('abc', 3, [{ type: 'reverseFilter', command: '$index < 2' }])
      deepStrictEqual(consoleLog.mock.calls[0].arguments[0], 'abc')
    })

    await test('should handle errors', () => {
      return rejects(
        executeCommands('abc', 1, [{ type: 'command', command: '$data()' }]),
        new NSedError('Invalid command "$data()": [TypeError] $data is not a function.')
      )
    })
  })
})
