export type PromiseResolver = (value?: any) => void
export type PromiseRejecter = (error: Error) => void

export interface Args {
  input: string
  whole: boolean
  encoding: string
}

export interface PackageInfo {
  version: string
  description: string
}

export type ImportedFunction = ($data: string, $index: number) => string

export type CommandType = 'command' | 'function' | 'filter' | 'reverseFilter'

export interface Command {
  type: CommandType
  command: string | ImportedFunction
}

export class NSedError extends Error {
  code: string

  constructor(message: string) {
    super(message)
    this.code = 'ENSED'
  }
}
