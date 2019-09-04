const schema = require('./schema')
const Block = require('@ipld/block')

const fromIter = async function * (iter, name, codec='dag-json', encoder=Block.encoder) {
  const bytesList = []
  for await (let chunk of iter) {
    const block = encoder(chunk, 'raw')
    yield block
    bytesList.push(await block.cid())
  }
  const file = schema.File.from({name, data: { bytesList }})
  const block = encoder(file.encode(), codec)
  yield block
}

exports.fromIter = fromIter
