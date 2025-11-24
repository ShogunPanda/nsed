import { NSedError } from './models.ts'

export function handleError(error: NSedError | Error, inputPath?: string, fatal: boolean = false): void {
  let finalMessage = null

  switch ((error as NSedError).code) {
    case 'ENSED':
      finalMessage = error.message
      break
    case 'ENOENT':
      finalMessage = `Cannot open file ${inputPath}: file not found.`
      break
    case 'EACCES':
      finalMessage = `Cannot open file ${inputPath}: permission denied.`
      break
  }

  if (finalMessage) {
    error = new NSedError(finalMessage)
  }

  if (!fatal) {
    throw error
  }

  console.error(error.message)
  process.exit(1)
}

export function showOutput(output: any): void {
  console.log(typeof output === 'undefined' || output === null ? `<${output}>` : output.toString())
}
