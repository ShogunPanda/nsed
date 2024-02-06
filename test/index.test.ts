/* eslint-disable @typescript-eslint/no-floating-promises */

import { deepStrictEqual, rejects } from 'node:assert'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { execute, processData } from '../src/index.js'
import { NSedError, type PackageInfo } from '../src/models.js'
import { requireModule } from '../src/operations.js'

const packageInfo: PackageInfo = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const dataFile = new URL('fixtures/data.txt', import.meta.url).toString().replace('file://', '')

test('NSed execution', async () => {
  await requireModule('crypto')

  await test('.processData', async () => {
    await test('whole mode', async () => {
      await test('should open the file and execute command', async t => {
        const consoleLog = t.mock.method(console, 'log')
        consoleLog.mock.mockImplementation(() => {})

        await processData(dataFile, 'utf8', true, [
          {
            type: 'command',
            command: 'crypto.createHash("sha1").update($data).digest("hex")'
          }
        ])

        deepStrictEqual(
          consoleLog.mock.calls.map(c => c.arguments),
          [['8601223fcd56ed69a21fcf643f7d0b9eba4ab64f']]
        )
      })

      await test('should handle open errors', async () => {
        await rejects(
          processData('/not-existing', 'utf8', true, [{ type: 'command', command: '$data' }]),
          new NSedError('Cannot open file /not-existing: file not found.')
        )
      })
    })

    await test('line by line', async () => {
      await test('should open the file and execute commands, streaming them line by line', async t => {
        const consoleLog = t.mock.method(console, 'log')
        consoleLog.mock.mockImplementation(() => {})

        await processData(dataFile, 'utf8', false, [
          {
            type: 'command',
            command: 'crypto.createHash("sha1").update($data).digest("hex")'
          }
        ])

        deepStrictEqual(
          consoleLog.mock.calls.map(c => c.arguments),
          [
            ['356a192b7913b04c54574d18c28d46e6395428ab'],
            ['da4b9237bacccdf19c0760cab7aec4a8359010b0'],
            ['77de68daecd823babbb58edb1c8e14d7106e83bb'],
            ['1b6453892473a467d07372d45eb05abc2031647a'],
            ['ac3478d69a3c81fa62e60f5c3696165a4e5e6ac4']
          ]
        )
      })

      await test('should handle open errors', async () => {
        await rejects(
          processData('/not-existing', 'utf8', false, [{ type: 'command', command: '$data' }]),
          new NSedError('Cannot open file /not-existing: file not found.')
        )
      })
    })
  })

  await test('.execute', async () => {
    await test('should correctly process line by line', async t => {
      const consoleLog = t.mock.method(console, 'log')
      consoleLog.mock.mockImplementation(() => {})

      await execute(
        `node index.js -i ${dataFile} -c crypto.createHash("sha1").update($data).digest("hex")`.split(' '),
        packageInfo
      )

      deepStrictEqual(
        consoleLog.mock.calls.map(c => c.arguments),
        [
          ['356a192b7913b04c54574d18c28d46e6395428ab'],
          ['da4b9237bacccdf19c0760cab7aec4a8359010b0'],
          ['77de68daecd823babbb58edb1c8e14d7106e83bb'],
          ['1b6453892473a467d07372d45eb05abc2031647a'],
          ['ac3478d69a3c81fa62e60f5c3696165a4e5e6ac4']
        ]
      )
    })

    await test('should correctly process as whole', async t => {
      const consoleLog = t.mock.method(console, 'log')
      consoleLog.mock.mockImplementation(() => {})

      await execute(
        `node index.js -w -i ${dataFile} -c crypto.createHash("sha1").update($data).digest("hex")`.split(' '),
        packageInfo
      )

      deepStrictEqual(
        consoleLog.mock.calls.map(c => c.arguments),
        [['8601223fcd56ed69a21fcf643f7d0b9eba4ab64f']]
      )
    })

    await test('should correctly handle errors', async t => {
      const consoleError = t.mock.method(console, 'error')
      const processExit = t.mock.method(process, 'exit')

      consoleError.mock.mockImplementation(() => {})
      processExit.mock.mockImplementation(() => {})

      await execute(
        `node index.js -w -i ${dataFile} -c crypto.createHash("whatever").update($data).digest("hex")`.split(' '),
        packageInfo
      )

      deepStrictEqual(
        consoleError.mock.calls.map(c => c.arguments),
        [
          [
            'Invalid command "crypto.createHash("whatever").update($data).digest("hex")": [Error] Digest method not supported.'
          ]
        ]
      )

      deepStrictEqual(processExit.mock.calls[0].arguments[0], 1)
    })

    await test('should return the original content if no commands are provided', async t => {
      const consoleLog = t.mock.method(console, 'log')
      consoleLog.mock.mockImplementation(() => {})

      await execute(`node index.js -i ${dataFile}`.split(' '), packageInfo)

      deepStrictEqual(
        consoleLog.mock.calls.map(c => c.arguments),
        [['1'], ['2'], ['3'], ['4'], ['5']]
      )

      consoleLog.mock.resetCalls()
      await execute(`node index.js -w -i ${dataFile}`.split(' '), packageInfo)

      deepStrictEqual(
        consoleLog.mock.calls.map(c => c.arguments),
        [['1\n2\n3\n4\n5']]
      )
    })

    await test('should execute command in order', async t => {
      const consoleLog = t.mock.method(console, 'log')
      consoleLog.mock.mockImplementation(() => {})

      await execute(
        `node index.js -i ${dataFile} -f $index>2 -c crypto.createHash("sha1").update($data).digest("hex")`.split(' '),
        packageInfo
      )

      deepStrictEqual(
        consoleLog.mock.calls.map(c => c.arguments),
        [
          ['77de68daecd823babbb58edb1c8e14d7106e83bb'],
          ['1b6453892473a467d07372d45eb05abc2031647a'],
          ['ac3478d69a3c81fa62e60f5c3696165a4e5e6ac4']
        ]
      )
    })

    await test('should use user-defined functions', async t => {
      const consoleLog = t.mock.method(console, 'log')
      consoleLog.mock.mockImplementation(() => {})

      await execute(`node index.js -i ${dataFile} -s test/fixtures/function.cjs`.split(' '), packageInfo)

      deepStrictEqual(
        consoleLog.mock.calls.map(c => c.arguments),
        [['1@1'], ['2@2'], ['3@3'], ['4@4'], ['5@5']]
      )
    })

    await test('should require Node modules', async t => {
      const consoleLog = t.mock.method(console, 'log')
      consoleLog.mock.mockImplementation(() => {})

      await execute(`node index.js -i ${dataFile} -r path -c path.resolve('/a',$data)`.split(' '), packageInfo)

      deepStrictEqual(
        consoleLog.mock.calls.map(c => c.arguments),
        [['/a/1'], ['/a/2'], ['/a/3'], ['/a/4'], ['/a/5']]
      )
    })
  })
})
