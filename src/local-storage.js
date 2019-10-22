'use strict'
const mkdirp = require('mkdirp')
const path = require('path')
const fs = require('fs').promises
const Block = require('@ipld/block')

const storage = dir => {
  mkdirp.sync(dir)
  const exports = {}
  const key = cid => path.join(dir, cid.toString('base32'))
  exports.put = async block => {
    const f = key(await block.cid())
    return fs.writeFile(f, block.encode())
  }
  exports.get = async cid => {
    const f = key(cid)
    const buffer = await fs.readFile(f)
    return Block.create(buffer, cid)
  }
  return exports
}

module.exports = storage
