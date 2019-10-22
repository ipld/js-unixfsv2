'use strict'
const types = require('./types')()
const rabin = require('rabin-generator')
const path = require('path')
const { createReadStream, promises } = require('fs')
const fs = promises

// eslint bug: https://github.com/eslint/eslint/issues/12459
// eslint-disable-next-line require-await
const fromFile = async function * (f, stat, opts = {}) {
  opts.chunker = opts.chunker || rabin
  let iter = createReadStream(f)
  iter = opts.chunker(iter)
  yield * types.File.fromIter(iter, path.parse(f).base, opts)
}

const fromDirectory = async function * (f, stat, opts = {}) {
  const codec = opts.codec || 'dag-cbor'
  const dirfiles = await fs.readdir(f)
  const results = {}
  let size = 0
  for (const file of dirfiles) {
    const iter = fromFileSystem(path.join(f, file), opts)
    for await (let { block, root } of iter) {
      if (block) yield { block }
      if (root) {
        block = root.block(codec)
        yield { block }
        if (root instanceof types.File) {
          size += await root.get('data/size')
          results[file] = { fileLink: await block.cid() }
        } else if (root instanceof types.Directory) {
          size += await root.get('size')
          results[file] = { dirLink: await block.cid() }
        }
      }
    }
  }
  const data = types.DirData.encoder({ map: results })
  const name = path.parse(f).base
  const dir = types.Directory.encoder({ data, size, name })
  yield { root: dir }
}

const fromFileSystem = async function * (f, opts = {}) {
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
