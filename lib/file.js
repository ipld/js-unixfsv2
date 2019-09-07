const schema = require('./schema')
const Block = require('@ipld/block')

const fromIter = async function * (iter, name, codec='dag-json', encoder=Block.encoder) {
  const bytesList = []
  let size = 0
  for await (let chunk of iter) {
    const block = encoder(chunk, 'raw')
    yield block
    bytesList.push(await block.cid())
    size += chunk.length
  }
  const file = schema.File.encoder({name, size, data: { bytesList }})
  const block = encoder(file.encode(), codec)
  yield block
}

exports.fromIter = fromIter
