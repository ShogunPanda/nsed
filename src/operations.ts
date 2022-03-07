import { basename, resolve } from 'node:path'
import { Command, CommandType, ImportedFunction, NSedError } from './models.js'
import { showOutput } from './output.js'

export async function parseCommand(type: CommandType, command: string): Promise<Command> {
  // Parse the command
  if (type === 'function') {
    try {
      let commandFunction = await import(resolve(process.cwd(), command))

      if (commandFunction.default) {
        // CJS/MJS inteoperability
        commandFunction = commandFunction.default
      }

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
  } else if (/^\$\d+$/.test(command)) {
    command = `RegExp.${command}`
  }

  return { type, command }
}

export async function requireModule(modulePath: string): Promise<void> {
  // Camelcase the module
  const moduleName = basename(modulePath)
    .toLowerCase()

    .replace(/[./-_]([\da-z])/, (_, t) => t.toUpperCase())

  try {
    Object.defineProperty(globalThis, moduleName, { value: await import(modulePath) })
  } catch {
    throw new NSedError(`Cannot find module "${modulePath}".`)
  }
}

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
