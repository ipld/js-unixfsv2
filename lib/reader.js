const CID = require('cids')
const Block = require('@ipld/block')
const createTypes = require('./schema')

const resolve = async (root, path) => {
  root = await root
  path = [].concat(path
    .split('/')
    .filter(x => x)
    .map(name => [name, 'files'])
  )
  path.push('files')
  return root.resolve(path)
}

class Reader {
  constructor(root, get) {
    this.types = creatTypes({getBlock: get})
    if (Block.isBlock(root)) {
      root = this.types.Directory.decoder(root.decode())
    }
    if (CID.isCID(root)) {
      root = get(root).then(b => this.types.Directory.decoder(b.decode()))
    }
    this.root = root
    this.get = get
  }
  async ls (path) {
    let files = []
    let node = await resolve(this.root, path)
    let keys = node.keys()
    for (const file of keys) {
      files.push(file)
    }
    return files
  }
}

module.exports = (...args) => new Reader(...args)
