#!/usr/bin/env node
'use strict'
const parseSchema = require('./src/parse.js')
const { inspect } = require('util')

const ioOptions = yargs => {
  yargs.positional('input', 
    { desc: 'input schema file' }
  )
  yargs.positional('output',
    { desc: 'output json file' }
  )
}

const parse = async argv => {
  let s = await parseSchema(argv.input, argv.output)
  if (!argv.output) console.log(inspect(s, {depth: Infinity}))
  else fs.writeFileSync(argv.output, JSON.stringify(s))
}

const yargs = require('yargs')
const args = yargs
  .command('parse <input> [output]', 'pull an hour of gharchive', ioOptions, parse)
  .argv

if (!args._.length) {
  yargs.showHelp()
}
