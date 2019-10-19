'use strict'
const schema = require('./schema')()
const Block = require('@ipld/block')
const rabin = require('rabin-generator')
const path = require('path')
const file = require('./file')
const { createReadStream, promises } = require('fs')
const fs = promises

// eslint bug: https://github.com/eslint/eslint/issues/12459
// eslint-disable-next-line require-await
const fromFile = async function * (f, stat, opts = {}) {
  opts.chunker = opts.chunker || rabin
  let iter = createReadStream(f)
  iter = opts.chunker(iter)
  yield * file.fromIter(iter, path.parse(f).base, opts)
}

const fromDirectory = async function * (f, stat, opts = {}) {
  const encoder = opts.encoder || Block.encoder
  const codec = opts.codec || 'dag-cbor'
  const dirfiles = await fs.readdir(f)
  const results = {}
  let size = 0
  for (const file of dirfiles) {
    const { iter, union } = await fromFileSystem(path.join(f, file), opts)
    let last
    for await (const block of iter) {
      await block.cid()
      yield block
      last = block
    }
    const source = last.source() || last.decode()
    size += typeof source.size !== 'undefined' ? source.size : source.data.size
    const r = {}
    r[union + 'Link'] = await last.cid()
    results[file] = r
  }
  const data = schema.DirData.encoder({ map: results })
  const name = path.parse(f).base
  const dir = schema.Directory.encoder({ data, size, name })
  const block = encoder(dir.encode(), codec)
  yield block
}

const fromFileSystem = async function (f, opts = {}) {
  const stat = await fs.stat(f)
  if (stat.isFile()) {
    return { union: 'file', iter: fromFile(f, stat, opts) }
  } else if (stat.isDirectory()) {
    return { union: 'dir', iter: fromDirectory(f, stat, opts) }
  }
}

exports = module.exports = async function * (f, opts) {
  const { iter } = await fromFileSystem(f, opts)
  yield * iter
}
exports.fromFileSystem = fromFileSystem
exports.fromDirectory = fromDirectory
exports.fromFile = fromFile
