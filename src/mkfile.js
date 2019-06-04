const Block = require('@ipld/block')
const iq = require('@ipld/iq')
const FixedChunker = require('@ipld/src/bytes/fixed-chunker') 
const defaultConfig = require('./defaults.json')
const merge = require('lodash.merge')

const mkfile = async function * mkfile (source, inline = false, config = {}) {
  let parts = []
  let size = 0

  if (Buffer.isBuffer(source)) {
    // noop
  } else {
    throw new Error('Not Implemented!')
  }

  let data
  if (!inline) {
    let builder = FixedChunker.create(source, config.chunker.fixed)
    let last
    for await (let block of builder) {
      last = block
      yield block
    }
    data = last
  } else {
    data = source
  }
  let f = {
    size: await iq(last).length(),
    type: 'IPFS/Experimental/File/0',
    data
  }
  
  yield Block.encoder(f, codec)
}

module.exports = mkfile
