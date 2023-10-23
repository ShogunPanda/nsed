export type PromiseResolver<T = any> = (value: T) => void
export type PromiseRejecter<E = Error> = (err: E) => void

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
    this.name = 'NSedError'
    this.code = 'ENSED'
  }
}

export function createPromiseForCallbacks<T = void, E = Error>(): [Promise<T>, PromiseResolver<T>, PromiseRejecter<E>] {
  let resolver: PromiseResolver<T>
  let rejecter: PromiseRejecter<E>

  const promise = new Promise<T>((resolve, reject) => {
    resolver = resolve
    rejecter = reject
  })

  return [promise, resolver!, rejecter!]
}
