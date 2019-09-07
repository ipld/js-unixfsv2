#!/usr/bin/env node
'use strict'
const parseSchema = require('./lib/parse.js')
const fs = require('fs')
const printify = require('@ipld/printify')
const { inspect } = require('util')
const api = require('./lib/fs')

const inputOption = yargs => {
  yargs.positional('input',
    { desc: 'input schema file' }
  )
}

const ioOptions = yargs => {
  inputOption(yargs)
  yargs.positional('output',
    { desc: 'output json file' }
  )
}

const parse = async argv => {
  const s = await parseSchema(argv.input, argv.output)
  if (!argv.output) console.log(inspect(s, { depth: Infinity }))
  else fs.writeFileSync(argv.output, JSON.stringify(s))
}

const runImport = async argv => {
  for await (const block of api.fromFileSystem(argv.input)) {
    if (block.codec === 'raw') {
      console.log('Block<raw>', (await block.cid()).toString())
    } else {
      console.log('Block<' + block.codec + '>', printify(block.decode()))
    }
  }
}

const yargs = require('yargs')
const args = yargs
  .command('parse <input> [output]', 'Parse schema file', ioOptions, parse)
  .command('import <input>', 'Import file or directory', inputOption, runImport)
  .argv

if (!args._.length) {
  yargs.showHelp()
}
