const streamChunker = require('stream-chunker')
const fs = require('fs')
const {PassThrough} = require('stream')
const Block = require('ipfs-block')
const CID = require('cids')
const multihashes = require('multihashes')
const crypto = require('crypto')
const path = require('path')

const {stat, readdir} = fs.promises

const {serialize, deserialize} = require('./cbor')

const sha2 = b => crypto.createHash('sha256').update(b).digest()

const mkblock = (buffer, type) => {
  let hash = multihashes.encode(sha2(buffer), 'sha2-256')
  let cid = new CID(1, type, hash)
  return new Block(buffer, cid)
}

const mkcbor = async obj => {
  return mkblock(await serialize(obj), 'dag-cbor')
}

const onemeg = 1000000

const rawfile = reader => {
  return (async function * () {
    let parts = []
    let size = 0

    for await (let chunk of reader) {
      let block = mkblock(chunk, 'raw')
      parts.push([[size, chunk.length], block.cid])
      yield block
      size += chunk.length
    }
    let f = {
      size,
      type: 'file',
      data: parts
    }
    yield await mkcbor(f)
  })()
}

const file = (path, chunker) => {
  let reader = chunker(path)
  return rawfile(reader)
}

const fixedChunker = (chunkSize = onemeg) => {
  return path => {
    let stream = fs.createReadStream(path)
    let chunker = stream.pipe(streamChunker(chunkSize, {flush: true}))
    let reader = chunker.pipe(new PassThrough({objectMode: true}))
    return reader
  }
}

const dir = (_path, recursive = true, chunker = fixedChunker()) => {
  return (async function * () {
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

      data[name] = last.cid
      size += (await deserialize(last.data)).size
    }
    yield await mkcbor({size, data, type: 'dir'})
  })()
}

exports.file = file
exports.dir = dir
exports.fs = require('./fs')
exports.fixedChunker = fixedChunker
exports.rawfile = rawfile
