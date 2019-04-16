const path = require('path')
const fs = require('fs')
const streamChunker = require('stream-chunker')
const { PassThrough } = require('stream')
const { Block } = require('@ipld/stack')
const mkfile = require('./mkfile')

const { stat, readdir } = fs.promises

const onemeg = 1000000

const last = async iter => {
  let _last
  for await (let block of iter) {
    _last = block
  }
  return _last
}

const file = (path, chunker, inline = false, codec = 'dag-cbor') => {
  let reader = chunker(path)
  if (inline) {
    let block = last(mkfile(reader, inline, codec))
    return block
  } else {
    return mkfile(reader, inline, codec)
  }
}

const fixedChunker = (chunkSize = onemeg) => {
  return path => {
    let stream = fs.createReadStream(path)
    let chunker = stream.pipe(streamChunker(chunkSize, { flush: true }))
    let reader = chunker.pipe(new PassThrough({ objectMode: true }))
    return reader
  }
}

const dir = async function * dir (_path, recursive = true, chunker = fixedChunker()) {
  let files = await readdir(_path)
  let size = 0
  let data = {}
  for (let name of files) {
    let fullpath = path.join(_path, name)
    let _stat = await stat(fullpath)

    let reader
    if (_stat.isDirectory() && recursive) {
      reader = dir(fullpath, true, chunker)
    } else {
      reader = file(fullpath, chunker)
    }

    let last
    for await (let block of reader) {
      yield block
      last = block
    }

    data[name] = await last.cid()
    size += (await last.decode()).size
  }
  yield Block.encoder({ size, data, type: 'dir' }, 'dag-cbor')
}

exports.file = file
exports.dir = dir
exports.fs = require('./fs')
exports.fixedChunker = fixedChunker
exports.mkfile = mkfile
