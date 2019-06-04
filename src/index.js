const path = require('path')
const fs = require('fs')
const streamChunker = require('stream-chunker')
const { PassThrough } = require('stream')
const Block = require('@ipld/block')
const mkfile = require('./mkfile')
const merge = require('lodash.merge')
const defaultConfig = require('./defaults.json')

const { stat, readdir, readFile } = fs.promises

const cfg = config => merge({}, defaultConfig, config)

const file = async (path, inline, config) => {
  config = cfg(config)
  let data = await readFile(path) 
  return mkfile(data, inline, config)
}

const dir = async function * dir (_path, recursive = true, config = {}) {
  config = cfg(config)
  let files = await readdir(_path)
  let size = 0
  let data = {}
  files = await Promise.all(files.map(name => async () => {
    let blocks = []
    let fullpath = path.join(_path, name)
    let _stat = await stat(fullpath)

    size += _stat.size

    let reader
    if (_stat.isDirectory() && recursive) {
      reader = dir(fullpath, true, config)
    } else {
      let inline = (config.inline.minSize > _stat.size)
      reader = await file(fullpath, inline, config)
    }

    let last
    for await (let block of reader) {
      blocks.push(block)
      last = block
    }
    return {name, blocks}
  }).map(f => f()))
  
  if (size > config.inline.minSize) {
    // pre-compute cids in parellel
    await Promise.all(files.map(f => f.blocks[f.blocks.length-1].cid()))
    for (let {name, blocks} of files) {
      let last
      for (let block in blocks) {
        yield block
        last = block
      }
      // cached cid 
      data[name] = await last.cid()
    }
  } else {
    for (let {name, blocks} of files) {
      // if the directory size is below the threshold
      // then all the files were as well
      let [ block ] = blocks
      data[name] = block.source()
    }
  }
  let type = 'IPFS/Experimental/Dir/0'
  yield Block.encoder({ size, data, type }, config.codec)
}

exports.file = file
exports.dir = dir
exports.fs = require('./fs')
exports.mkfile = mkfile
