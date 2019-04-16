const { Block } = require('@ipld/stack')

const mkfile = async function * mkfile (source, inline = false, codec = 'dag-cbor') {
  let parts = []
  let size = 0

  if (Buffer.isBuffer(source)) {
    if (inline) parts = [[[0, source.length], source]]
    else {
      let block = Block.encoder(source, 'raw')
      yield block
      parts = [[[0, source.length], await block.cid()]]
    }
  } else {
    if (inline) {
      for await (let chunk of source) {
        parts.push([[size, chunk.length], chunk])
      }
    } else {
      for await (let chunk of source) {
        let block = Block.encoder(chunk, 'raw')
        parts.push([[size, chunk.length], await block.cid()])
        yield block
        size += chunk.length
      }
    }
  }
  let f = {
    size,
    type: 'file',
    data: parts
  }
  yield Block.encoder(f, codec)
}

module.exports = mkfile
