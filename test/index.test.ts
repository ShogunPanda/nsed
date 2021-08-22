/* eslint-disable @typescript-eslint/no-floating-promises */

import { readFileSync } from 'fs'
import sinon, { SinonSpyCall } from 'sinon'
import t from 'tap'
import { execute, processData } from '../src/index'
import { NSedError } from '../src/models'
import { requireModule } from '../src/operations'

type Test = typeof t

const packageInfo = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))
const dataFile = new URL('./fixtures/data.txt', import.meta.url).toString().replace('file://', '')

t.test('NSed execution', (t: Test) => {
  const logStub = sinon.stub(console, 'log')
  const errorStub = sinon.stub(console, 'error')
  const processStub = sinon.stub(process, 'exit')
  requireModule('crypto')

  t.teardown(() => {
    logStub.restore()
    errorStub.restore()
    processStub.restore()
  })

  t.test('.processData', (t: Test) => {
    t.test('whole mode', (t: Test) => {
      t.test('should open the file and execute command', async (t: Test) => {
        logStub.reset()

        await processData(dataFile, 'utf-8', true, [
          { type: 'command', command: 'crypto.createHash("sha1").update($data).digest("hex")' }
        ])

        t.same(
          logStub.getCalls().map((m: SinonSpyCall) => m.args),
          [['8601223fcd56ed69a21fcf643f7d0b9eba4ab64f']]
        )
      })

      t.test('should handle open errors', async (t: Test) => {
        t.rejects(
          processData('/not-existing', 'utf-8', true, [{ type: 'command', command: '$data' }]),
          new NSedError('Cannot open file /not-existing: file not found.')
        )
      })

      t.end()
    })

    t.test('line by line', (t: Test) => {
      t.test('should open the file and execute commands, streaming them line by line', async (t: Test) => {
        logStub.reset()

        await processData(dataFile, 'utf-8', false, [
          { type: 'command', command: 'crypto.createHash("sha1").update($data).digest("hex")' }
        ])

        t.same(
          logStub.getCalls().map((m: SinonSpyCall) => m.args),
          [
            ['356a192b7913b04c54574d18c28d46e6395428ab'],
            ['da4b9237bacccdf19c0760cab7aec4a8359010b0'],
            ['77de68daecd823babbb58edb1c8e14d7106e83bb'],
            ['1b6453892473a467d07372d45eb05abc2031647a'],
            ['ac3478d69a3c81fa62e60f5c3696165a4e5e6ac4']
          ]
        )
      })

      t.test('should handle open errors', async (t: Test) => {
        t.rejects(
          processData('/not-existing', 'utf-8', false, [{ type: 'command', command: '$data' }]),
          new NSedError('Cannot open file /not-existing: file not found.')
        )
      })

      t.end()
    })

    t.end()
  })

  t.test('.execute', (t: Test) => {
    t.test('should correctly process line by line', async (t: Test) => {
      logStub.reset()

      await execute(
        `node index.js -i ${dataFile} -c crypto.createHash("sha1").update($data).digest("hex")`.split(' '),
        packageInfo
      )

      t.same(
        logStub.getCalls().map((m: SinonSpyCall) => m.args),
        [
          ['356a192b7913b04c54574d18c28d46e6395428ab'],
          ['da4b9237bacccdf19c0760cab7aec4a8359010b0'],
          ['77de68daecd823babbb58edb1c8e14d7106e83bb'],
          ['1b6453892473a467d07372d45eb05abc2031647a'],
          ['ac3478d69a3c81fa62e60f5c3696165a4e5e6ac4']
        ]
      )
    })

    t.test('should correctly process as whole', async (t: Test) => {
      logStub.reset()

      await execute(
        `node index.js -w -i ${dataFile} -c crypto.createHash("sha1").update($data).digest("hex")`.split(' '),
        packageInfo
      )

      t.same(
        logStub.getCalls().map((m: SinonSpyCall) => m.args),
        [['8601223fcd56ed69a21fcf643f7d0b9eba4ab64f']]
      )
    })

    t.test('should correctly handle errors', async (t: Test) => {
      logStub.reset()

      await execute(
        `node index.js -w -i ${dataFile} -c crypto.createHash("whatever").update($data).digest("hex")`.split(' '),
        packageInfo
      )

      t.same(
        errorStub.getCalls().map((m: SinonSpyCall) => m.args),
        [
          [
            'Invalid command "crypto.createHash("whatever").update($data).digest("hex")": [Error] Digest method not supported.'
          ]
        ]
      )

      t.equal(processStub.firstCall.args[0], 1)
    })

    t.test('should return the original content if no commands are provided', async (t: Test) => {
      logStub.reset()

      await execute(`node index.js -i ${dataFile}`.split(' '), packageInfo)

      t.same(
        logStub.getCalls().map((m: SinonSpyCall) => m.args),
        [['1'], ['2'], ['3'], ['4'], ['5']]
      )

      logStub.reset()

      await execute(`node index.js -w -i ${dataFile}`.split(' '), packageInfo)

      t.same(
        logStub.getCalls().map((m: SinonSpyCall) => m.args),
        [['1\n2\n3\n4\n5']]
      )
    })

    t.test('should execute command in order', async (t: Test) => {
      logStub.reset()

      await execute(
        `node index.js -i ${dataFile} -f $index>2 -c crypto.createHash("sha1").update($data).digest("hex")`.split(' '),
        packageInfo
      )

      t.same(
        logStub.getCalls().map((m: SinonSpyCall) => m.args),
        [
          ['77de68daecd823babbb58edb1c8e14d7106e83bb'],
          ['1b6453892473a467d07372d45eb05abc2031647a'],
          ['ac3478d69a3c81fa62e60f5c3696165a4e5e6ac4']
        ]
      )
    })

    t.test('should use user-defined functions', async (t: Test) => {
      logStub.reset()

      await execute(`node index.js -i ${dataFile} -s test/fixtures/function.cjs`.split(' '), packageInfo)

      t.same(
        logStub.getCalls().map((m: SinonSpyCall) => m.args),
        [['1@1'], ['2@2'], ['3@3'], ['4@4'], ['5@5']]
      )
    })

    t.test('should require Node modules', async (t: Test) => {
      logStub.reset()

      await execute(`node index.js -i ${dataFile} -r path -c path.resolve('/a',$data)`.split(' '), packageInfo)

      t.same(
        logStub.getCalls().map((m: SinonSpyCall) => m.args),
        [['/a/1'], ['/a/2'], ['/a/3'], ['/a/4'], ['/a/5']]
      )
    })

    t.end()
  })

  t.end()
})
