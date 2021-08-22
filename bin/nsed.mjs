#!/usr/bin/env node

import { readFileSync } from 'fs'
import { execute } from '../dist/index.js'

function failureHandler(error) {
  let message = error

  if (error.code === 'ENSED') {
    message = error.message
  }

  console.error(message)
  process.exit(1)
}

process.on('unhandledRejection', failureHandler)
process.on('uncaughtException', failureHandler)

execute(process.argv, JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'))).catch(failureHandler)
