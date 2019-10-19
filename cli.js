#!/usr/bin/env node
'use strict'
const parseSchema = require('./src/parse.js')
const fs = require('fs')
const printify = require('@ipld/printify')
const { inspect } = require('util')
const api = require('./src/fs')
const reader = require('./src/reader')
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

const createReader = argv => {
  const store = createStorage(argv.storage)
  const _reader = reader(argv.rootCID, store.get)
  return _reader
}

const runRead = async argv => {
  const reader = createReader(argv)
  for await (const buffer of reader.read(argv.path, argv.start, argv.end)) {
    process.stdout.write(buffer)
  }
}
const runLs = async argv => {
  const reader = createReader(argv)
  const files = await reader.ls(argv.path)
  files.forEach(f => console.log(f))
}

const storageOptions = yargs => {
  yargs.option('storage', { desc: 'Directory to store blocks' })
}
const importOptions = yargs => {
  yargs.positional('input', { desc: 'File or directory to import' })
  storageOptions(yargs)
}
const readerOptions = yargs => {
  yargs.positional('storage', { desc: 'Directory of stored blocks' })
  yargs.positional('rootCID', { desc: 'CID of root node for file or directory' })
}
const readOptions = yargs => {
  readerOptions(yargs)
  yargs.positional('path', { desc: 'Path to filename' })
  yargs.option('start', { desc: 'starting position, defaults to 0' })
  yargs.option('end', { desc: 'ending position, defaults to end of file' })
}
const lsOptions = yargs => {
  readerOptions(yargs)
  yargs.positional('path', { desc: 'Path to directory' })
}

const yargs = require('yargs')
const args = yargs
  .command('parse <input> [output]', 'Parse schema file', importOptions, parse)
  .command('import <input>', 'Import file or directory', storageOptions, runImport)
  .command('ls <storage> <rootCID> <path>', 'List directory contents', lsOptions, runLs)
  .command('read <storage> <rootCID> <path>', 'Read file contents', readOptions, runRead)
  .argv

if (!args._.length) {
  yargs.showHelp()
}
