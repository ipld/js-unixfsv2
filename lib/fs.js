const schema = require('./schema')
const Block = require('@ipld/block')
const rabin = require('rabin-generator')
const path = require('path')
const file = require('./file')
const { createReadStream, promises } = require('fs')
const fs = promises

const fromFile = async function * (f, stat, opts={}) {
  opts.chunker = opts.chunker || rabin
  let iter = createReadStream(f)
  iter = opts.chunker(iter)
  yield * file.fromIter(iter, path.parse(f).base, opts)
}

const fromDirectory = async function * (f, stat, opts={}) {
  let encoder = opts.encoder || Block.encoder
  let codec = opts.codec || 'dag-json'
  let dirfiles = await fs.readdir(f)
  let results = {}
  let size = 0
  for (let file of dirfiles) {
    let iter = fromFileSystem(path.join(f, file), opts)
    let last
    let _size
    for await (let block of iter) {
      let source = block.source()
      if (source) _size = source.size
      yield block
      last = block
    }
    if (_size) size += _size
    results[file] = await last.cid()
  }
  const files = schema.Files.encoder({map: results})
  const name = path.parse(f).base
  const dir = schema.Directory.encoder({files, size, name})
  const block = encoder(dir.encode(), codec)
  yield block   
}

const fromFileSystem = async function * (f, opts={}) {
  const stat = await fs.stat(f)
  if (stat.isFile()) {
    yield * fromFile(f, stat, opts)
  } else if (stat.isDirectory()) {
    yield * fromDirectory(f, stat, opts)
  }
}

exports = module.exports = fromFileSystem
exports.fromFileSystem = fromFileSystem
exports.fromDirectory = fromDirectory
exports.fromFile = fromFile


