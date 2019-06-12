const Block = require('@ipld/block')
const iq = require('@ipld/iq')
const FixedChunker = require('@ipld/generics/src/bytes/fixed-chunker') 
const defaultConfig = require('./defaults.json')
const merge = require('lodash.merge')

const mkfile = async function * mkfile (source, name, inline = false, config = {}) {
  let cfg = merge({}, defaultConfig, config)
  let parts = []

  if (Buffer.isBuffer(source)) {
    // noop
  } else {
    throw new Error('Not Implemented!')
  }

  let data
  let size 
  if (!inline) {
    let builder = FixedChunker.create(source, cfg.chunker.fixed)
    let last
    let blocks = []
    for await (let block of builder) {
      last = block
      yield block
      blocks.push(block)
    }
    data = last
    let q = iq.defaults({
      get: async cid => {
        for (let block of blocks) {
          if (cid.equals(await block.cid())) return block
        }
        return null
      }
    })(data)
    
    q.config.lookup.register(FixedChunker)
    size = await q.length()
  } else {
    data = source
    size = source.length
  }
  if (Block.isBlock(data)) data = await data.cid()
  let f = {
    type: 'IPFS/Experimental/File/0',
    name,
    size,
    data
  }
  
  yield Block.encoder(f, cfg.codec)
}

module.exports = mkfile
