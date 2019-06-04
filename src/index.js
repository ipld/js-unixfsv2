const path = require('path')
const fs = require('fs')
const streamChunker = require('stream-chunker')
const { PassThrough } = require('stream')
const Block = require('@ipld/block')
const mkfile = require('./mkfile')
const merge = require('lodash.merge')
const defaultConfig = require('./defaults.json')

const { stat, readdir, readFile } = fs.promises

const file = (path, inline, config) => {
  let data = fs.readFile(path) 
  return mkfile(data, inline, config)
}

const dir = async function * dir (_path, recursive = true, config = {}) {
  let cfg = merge({}, defaultConfig, config)
  let files = await readdir(_path)
  let size = 0
  let data = {}
  for (let name of files) {
    let fullpath = path.join(_path, name)
    let _stat = await stat(fullpath)

    let reader
    if (_stat.isDirectory() && recursive) {
      reader = dir(fullpath, true, cfg)
    } else {
      let inline = (config.inline.minSize > _stat.size)
      reader = file(fullpath, inline, cfg)
    }

    let last
    for await (let block of reader) {
      yield block
      last = block
    }

    data[name] = await last.cid()
    size += _stat.size
  }
  let type = 'IPFS/Experimental/Dir/0'
  yield Block.encoder({ size, data, type }, config.codec)
}

exports.file = file
exports.dir = dir
exports.fs = require('./fs')
exports.mkfile = mkfile
