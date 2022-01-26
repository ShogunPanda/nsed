import { Command as Commander } from 'commander'
import { createReadStream, ReadStream } from 'fs'
import getStream from 'get-stream'
import pump from 'pump'
import split2 from 'split2'
import { Command, CommandType, PackageInfo, PromiseResolver } from './models'
import { executeCommands, parseCommand, requireModule } from './operations'
import { handleError } from './output'

async function addCommand(commands: Array<Command>, type: CommandType, command: string): Promise<void> {
  commands.push(await parseCommand(type, command))
}

export async function processData(
  input: string,
  encoding: BufferEncoding,
  whole: boolean,
  commands: Array<Command>
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
      contents = await getStream(stream)
    } catch (e) {
      handleError(e, input)
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
  }).catch(e => {
    handleError(e, input)
  })
}

export function execute(args: Array<string>, { version, description }: PackageInfo): Promise<void> {
  let promiseResolve: PromiseResolver

  const promise = new Promise<void>(resolve => {
    promiseResolve = resolve
  })

  const cli = new Commander()
  const commands: Array<Command> = []

  // Parse input
  cli
    .storeOptionsAsProperties(false)
    .version(version, '-v, --version', 'Shows the version.')
    .usage('[options]')
    .description(description)
    .option('-i, --input <FILE>', 'File to read instead of using standard input.')
    .option('-w, --whole', 'Consider the input a single string instead of processing it line by line.')
    .option(
      '-r, --require <MODULE>',
      'Require a module before processing. The module will be available with its name camelcased.',
      requireModule
    )
    .option(
      '-c, --command <COMMAND>',
      'A JS expression to evaluate. $data and $index represent current data and line number.',
      addCommand.bind(null, commands, 'command')
    )
    .option(
      '-s, --source <SOURCE>',
      'File that exports a Javascript function to process data.',
      addCommand.bind(null, commands, 'function')
    )
    .option(
      '-f, --filter <COMMAND>',
      'A JS expression or regexp to filter: Truthy values will cause current line to be discarded.',
      addCommand.bind(null, commands, 'filter')
    )
    .option(
      '-F, --reverse-filter <COMMAND>',
      'A JS expression or regexp to filter: Falsy values will cause current line to be discarded.',
      addCommand.bind(null, commands, 'reverseFilter')
    )
    .option('-e, --encoding <ENCODING>', 'The encoding to use.', 'utf8')
    .parse(args)

  const { input, encoding, whole } = cli.opts()

  processData(input, encoding, whole, commands)
    .catch(e => {
      handleError(e, input, true)
    })
    .finally(promiseResolve!)

  return promise
}
