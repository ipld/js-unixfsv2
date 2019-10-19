#!/usr/bin/env node
'use strict'
const parseSchema = require('./src/parse.js')
const fs = require('fs')
const printify = require('@ipld/printify')
const { inspect } = require('util')
const api = require('./src/fs')
const createStorage = require('./src/localStorage')

/* eslint-disable no-console */

const parse = async argv => {
  const s = await parseSchema(argv.input, argv.output)
  if (!argv.output) console.log(inspect(s, { depth: Infinity }))
  else fs.writeFileSync(argv.output, JSON.stringify(s))
}

const runImport = async argv => {
  const { iter } = await api.fromFileSystem(argv.input)
  let store
  if (argv.storage) store = createStorage(argv.storage)
  let last
  for await (const block of iter) {
    if (store) {
      await store.put(block)
    } else {
      if (block.codec === 'raw') {
        console.log('Block<raw>', (await block.cid()).toString())
      } else {
        console.log('Block<' + block.codec + '>', printify(block.decode()))
      }
    }
    last = block
  }
  console.log('Root:', (await last.cid()).toString('base32'))
}

const storageOptions = yargs => {
  yargs.option('storage', { desc: 'Directory to store blocks' })
}
const importOptions = yargs => {
  yargs.positional('input', { desc: 'File or directory to import' })
  storageOptions(yargs)
}

const yargs = require('yargs')
const args = yargs
  .command('parse <input> [output]', 'Parse schema file', importOptions, parse)
  .command('import <input>', 'Import file or directory', storageOptions, runImport)
  // .command('read <storageDirectory> <rootCID> <file> [start] [end]', readOptions, runRead)
  .argv

if (!args._.length) {
  yargs.showHelp()
}
