'use strict'
const schema = require('./schema')()
const Block = require('@ipld/block')
const bytes = require('bytesish')

const defaultCodec = 'dag-json'

const fromIter = async function * (iter, name, opts = {}) {
  const { write, end } = schema.Data.writer(opts)
  for await (let chunk of iter) {
    chunk = bytes.native(chunk)
    const block = write(chunk)
    yield block
  }
  const data = await end()
  if (data.blocks) {
    yield * data.blocks
    delete data.blocks
  }

  const file = schema.File.encoder({ name, data })
  const block = Block.encoder(file.encode(), opts.codec || defaultCodec)
  yield block
}

exports.fromIter = fromIter
