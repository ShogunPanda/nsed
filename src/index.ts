import { Command as Commander } from 'commander'
import { createReadStream, type ReadStream } from 'node:fs'
import pump from 'pump'
import split2 from 'split2'
import { createPromiseForCallbacks, type Command, type CommandType, type PackageInfo } from './models.js'
import { executeCommands, parseCommand, requireModule } from './operations.js'
import { handleError } from './output.js'

function parseOptionAsync(promises: Promise<void>[], fn: (...args: any[]) => Promise<void>, ...args: any[]): void {
  const [promise, resolve, reject] = createPromiseForCallbacks()

  promises.push(promise)
  fn(...args)
    .then(resolve)
    .catch(reject)
}

async function addCommand(commands: Command[], type: CommandType, command: string): Promise<void> {
  commands.push(await parseCommand(type, command))
}

export async function processData(
  input: string,
  encoding: BufferEncoding,
  whole: boolean,
  commands: Command[]
): Promise<void> {
  let stream: ReadStream = process.stdin as unknown as ReadStream

  // Open the file if not processing stdin
  if (input) {
    stream = createReadStream(input, encoding)
  }

  // If whole, get the entire stream contents and process as single line
  if (whole) {
    let contents = ''

    try {
      for await (const chunk of stream) {
        contents += chunk.toString(encoding)
      }
    } catch (error) {
      handleError(error, input)
    }

    return executeCommands(contents, 0, commands)
  }

  // Process line by line using split2
  return new Promise<void>((resolve, reject) => {
    let index = 0

    // Split the stream
    const pipe = pump(stream, split2('\n'), err => {
      if (err) {
        reject(err)
      }

      resolve()
    }) as ReadStream

    // For each line
    pipe.on('data', line => {
      // Allow promises to finish before resuming
      pipe.pause()

      // Increase the line
      index++

      // Process line and then resume the pipe
      executeCommands(line as string, index, commands)
        .then(() => pipe.resume())
        .catch(handleError)
    })

    // Start processing
    pipe.resume()
  }).catch(error => {
    handleError(error, input)
  })
}

export async function execute(args: string[], { version, description }: PackageInfo): Promise<void> {
  const cli = new Commander()
  const commands: Command[] = []
  const promises: Promise<void>[] = []

  // Parse input
  await cli
    .storeOptionsAsProperties(false)
    .version(version, '-v, --version', 'Shows the version.')
    .usage('[options]')
    .description(description)
    .option('-i, --input <FILE>', 'File to read instead of using standard input.')
    .option('-w, --whole', 'Consider the input a single string instead of processing it line by line.')
    .option(
      '-r, --require <MODULE>',
      'Require a module before processing. The module will be available with its name camelcased.',
      parseOptionAsync.bind(null, promises, requireModule)
    )
    .option(
      '-c, --command <COMMAND>',
      'A JS expression to evaluate. $data and $index represent current data and line number.',
      parseOptionAsync.bind(null, promises, addCommand, commands, 'command')
    )
    .option(
      '-s, --source <SOURCE>',
      'File that exports a Javascript function to process data.',
      parseOptionAsync.bind(null, promises, addCommand, commands, 'function')
    )
    .option(
      '-f, --filter <COMMAND>',
      'A JS expression or regexp to filter: Truthy values will cause current line to be discarded.',
      parseOptionAsync.bind(null, promises, addCommand, commands, 'filter')
    )
    .option(
      '-F, --reverse-filter <COMMAND>',
      'A JS expression or regexp to filter: Falsy values will cause current line to be discarded.',
      parseOptionAsync.bind(null, promises, addCommand, commands, 'reverseFilter')
    )
    .option('-e, --encoding <ENCODING>', 'The encoding to use.', 'utf8')
    .parseAsync(args)

  await Promise.all(promises)
  const { input, encoding, whole } = cli.opts()

  try {
    await processData(input, encoding, whole, commands)
  } catch (error) {
    handleError(error, input, true)
  }
}
