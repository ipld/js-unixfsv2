#!/usr/bin/env node
const defaults = require('./src/defaults')
const { dir, file } = require('./')
const fs = require('./src/fs')
const FS = require('fs').promises
const printify = require('@ipld/printify')

const log = (msg, args) => {
  if (!args.silent) console.log(msg)
}

const encode = async args => {
  let iter
  for (let _file of args.files) {
    let _stat = await FS.stat(_file)
    if (_stat.isDirectory()) {
      log(`Encoding Directory: ${_file}`, args)
      iter = dir(_file)
    } else {
      log(`Encoding File: ${_file}`, args)
      iter = file(_file)
    }

    let last
    for await (let block of iter) {
      if (block.codec === 'raw') {
        log(`Block: RAW(${(await block.cid()).toString()})`)
      } else {
        log(`Block: ${printify(block.decode())}`, args)
      }
      last = block
    }
    log(`Encoded ${_file} to ${(await last.cid()).toString()}`, args)
  }
}


/* eslint ignore-next */
require('yargs')
  .command({
    command: 'encode [files..]',
    aliases: ['e'],
    desc: 'Encode files into IPLD blocks',
    handler: encode,
    builder: yargs => {
      yargs.positional('files', {
        desc: 'Files to encode',
      })
    }
  })
  .argv
