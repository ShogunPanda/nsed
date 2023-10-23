/* eslint-disable @typescript-eslint/no-floating-promises */

import t from 'tap'
import { NSedError } from '../src/models.js'
import { executeCommands, parseCommand, requireModule } from '../src/operations.js'

t.test('NSed operations', t => {
  requireModule('crypto')

  t.test('parseCommand', t => {
    t.test('should return the right command', async t => {
      t.same(await parseCommand('command', '.foo'), {
        type: 'command',
        command: '$data.foo'
      })

      t.same(await parseCommand('command', '[2]'), {
        type: 'command',
        command: '$data[2]'
      })

      t.same(await parseCommand('command', '[whatever]'), {
        type: 'command',
        command: '$data[whatever]'
      })

      t.same(await parseCommand('command', '/^\\d/'), {
        type: 'command',
        command: '$data.toString().match(/^\\d/)'
      })

      t.same(await parseCommand('command', '$1'), {
        type: 'command',
        command: 'RegExp.$1'
      })

      t.same(await parseCommand('command', 'foo'), {
        type: 'command',
        command: 'foo'
      })

      t.same(await parseCommand('filter', '$1'), {
        type: 'filter',
        command: 'RegExp.$1'
      })

      t.same(await parseCommand('reverseFilter', '$1'), {
        type: 'reverseFilter',
        command: 'RegExp.$1'
      })

      const fileName = import.meta.url.toString().replace('file://', '')
      const imported = await parseCommand(
        'function',
        new URL('fixtures/function.cjs', import.meta.url).toString().replace('file://', '')
      )
      t.equal(imported.type, 'function')
      t.type(imported.command, Function)

      t.rejects(parseCommand('function', fileName), new NSedError(`File "${fileName}" must export a function.`))

      t.rejects(parseCommand('function', '/foo'), new NSedError('Cannot require file "/foo".'))
    })

    t.end()
  })

  t.test('.requireModule', t => {
    t.test('should require a module and make it available in the global scope', async t => {
      t.type((globalThis as any).stringDecoder, 'undefined')
      await requireModule('string_decoder')
      t.type((globalThis as any).stringDecoder, 'object')

      t.rejects(requireModule('foo'), new NSedError('Cannot find module "foo".'))
    })

    t.end()
  })

  t.test('.executeCommand', t => {
    t.test('should correctly execute commands', async t => {
      const logCalls = t.capture(console, 'log')

      await executeCommands('abc', 0, [
        { type: 'command', command: '$data[1]' },
        { type: 'command', command: '$data + $index' }
      ])

      t.equal(logCalls()[0].args[0], 'b0')
    })

    t.test('should correctly execute functions', async t => {
      const logCalls = t.capture(console, 'log')

      await executeCommands('abc', 0, [
        { type: 'function', command: $data => $data[1] },
        { type: 'command', command: '$data + $index' }
      ])

      t.equal(logCalls()[0].args[0], 'b0')
    })

    t.test('should correctly handle filters', async t => {
      const logCalls = t.capture(console, 'log')

      await executeCommands('abc', 1, [{ type: 'filter', command: '$index < 2' }])
      t.equal(logCalls()[0].args[0], 'abc')

      await executeCommands('abc', 3, [{ type: 'filter', command: '$index < 2' }])
      t.equal(logCalls().length, 0)
    })

    t.test('should correctly handle reverse filters', async t => {
      const logCalls = t.capture(console, 'log')

      await executeCommands('abc', 1, [{ type: 'reverseFilter', command: '$index < 2' }])
      t.equal(logCalls().length, 0)

      await executeCommands('abc', 3, [{ type: 'reverseFilter', command: '$index < 2' }])
      t.equal(logCalls()[0].args[0], 'abc')
    })

    t.test('should handle errors', t => {
      return t.rejects(
        executeCommands('abc', 1, [{ type: 'command', command: '$data()' }]),
        new NSedError('Invalid command "$data()": [TypeError] $data is not a function.')
      )
    })

    t.end()
  })

  t.end()
})
