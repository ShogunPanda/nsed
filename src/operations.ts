import { basename, resolve } from 'path'
import { Command, CommandType, ImportedFunction, NSedError } from './models'
import { showOutput } from './output'

export function parseCommand(type: CommandType, command: string): Command {
  // Parse the command
  if (type === 'function') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const commandFunction = require(resolve(process.cwd(), command))

      if (typeof commandFunction !== 'function') {
        throw new NSedError(`File "${command}" must export a function.`)
      }

      return { type: 'function', command: commandFunction }
    } catch (error) {
      if (error.code === 'ENSED') {
        throw error
      }

      throw new NSedError(`Cannot require file "${command}".`)
    }
  } else if (command.startsWith('.') || command.startsWith('[')) {
    command = `$data${command}`
  } else if (command.startsWith('/')) {
    command = `$data.toString().match(${command})`
  } else if (command.match(/^\$\d+$/)) {
    command = `RegExp.${command}`
  }

  return { type, command }
}

export function requireModule(modulePath: string): void {
  // Camelcase the module
  const moduleName = basename(modulePath)
    .toLowerCase()
    // eslint-disable-next-line no-useless-escape
    .replace(/(?:[\/-_\.])([a-z0-9])/, (_: string, t: string) => t.toUpperCase())

  try {
    Object.assign(global, { [moduleName]: require(modulePath) })
  } catch (e) {
    throw new NSedError(`Cannot find module "${modulePath}".`)
  }
}

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export async function executeCommands($data: string, $index: number, commands: Array<Command>): Promise<void> {
  // Apply all commands
  for (const cmd of commands) {
    const { type, command } = cmd

    try {
      // eslint-disable-next-line no-eval
      const res = await (type === 'function' ? (command as ImportedFunction)($data, $index) : eval(command as string))

      // Update $data
      switch (type) {
        case 'filter':
          // A filter returned a falsy value, filter out
          if (!res) {
            return
          }

          break
        case 'reverseFilter':
          // A reverse filter returned a truthy value, filter out
          if (res) {
            return
          }

          break
        default:
          $data = res
      }
    } catch (error) {
      throw new NSedError(`Invalid command "${command}": [${error.name}] ${error.message}.`)
    }
  }

  return showOutput($data)
}