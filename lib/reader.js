const CID = require('cids')
const Block = require('@ipld/block')
const api = require('./schema')

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
    if (Block.isBlock(root)) {
      root = api.Directory.decoder(root.decode())
    }
    if (CID.isCID(root)) {
      root = get(root).then(b => api.Directory.decoder(b.decode()))
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
