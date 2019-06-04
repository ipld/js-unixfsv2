const Block = require('@ipld/block')
const iq = require('@ipld/iq')
const FixedChunker = require('@ipld/types/src/bytes/fixed-chunker') 
const defaultConfig = require('./defaults.json')
const merge = require('lodash.merge')

const mkfile = async function * mkfile (source, inline = false, config = {}) {
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
    for await (let block of builder) {
      last = block
      yield block
    }
    data = last
    size = await iq(data).length()
  } else {
    data = source
    size = source.length
  }
  let f = {
    type: 'IPFS/Experimental/File/0',
    size,
    data
  }
  
  yield Block.encoder(f, cfg.codec)
}

module.exports = mkfile
