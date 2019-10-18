'use strict'
const schema = require('./schema')()
const Block = require('@ipld/block')
const bytes = require('bytesish')

const codec = 'dag-json'
const encoder = Block.encoder
const defaults = { codec, encoder, arrayLimit: 512 }

const fromIter = async function * (iter, name, opts = {}) {
  opts = Object.assign({}, defaults, opts)
  const bytesList = []
  let size = 0
  // iter = opts.chunker(iter)
  for await (let chunk of iter) {
    chunk = bytes.native(chunk)
    const block = opts.encoder(chunk, 'raw')
    yield block
    bytesList.push([[size, chunk.length], await block.cid()])
    size += chunk.length
  }

  let b
  if (bytesList.length === 1) {
    b = { bytesLink: bytesList[0][1] }
  } else {
    if (bytesList.length < opts.arrayLimit) {
      const indexes = bytesList.map(b => b[0])
      const parts = bytesList.map(b => b[1])
      b = { byteLinks: { indexes, parts } }
    } else {
      throw new Error('Not Implemented')
    }
  }

  const file = schema.File.encoder({ name, data: { bytes: b, size } })
  const block = opts.encoder(file.encode(), opts.codec)
  yield block
}

exports.fromIter = fromIter
