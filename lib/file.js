const schema = require('./schema')
const Block = require('@ipld/block')
const bytes = require('bytesish')

const codec = 'dag-json'
const encoder = Block.encoder
const defaults = {codec, encoder}

const fromIter = async function * (iter, name, opts={}) {
  opts = Object.assign({}, defaults, opts)
  const bytesList = []
  let size = 0
  // iter = opts.chunker(iter)
  for await (let chunk of iter) {
    chunk = bytes.native(chunk)
    const block = opts.encoder(chunk, 'raw')
    yield block
    bytesList.push(await block.cid())
    size += chunk.length
  }
  const file = schema.File.encoder({name, size, data: { bytesList }})
  const block = opts.encoder(file.encode(), opts.codec)
  yield block
}

exports.fromIter = fromIter
