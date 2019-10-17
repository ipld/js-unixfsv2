const CID = require('cids')
const Block = require('@ipld/block')
const createTypes = require('./schema')

const buildPath = (path) => {
  return [].concat(
    ...path
    .split('/')
    .filter(x => x)
    .map(name => ['data', '*', name, '*'])
  )
}

class Reader {
  constructor(root, get) {
    this.types = createTypes({getBlock: get})
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
    let root = await this.root
    let files = []
    path = [].concat(buildPath(path), ['data', '*']).join('/')
    let node = await root.getNode(path)
    let keys = node.keys()
    for await (const file of keys) {
      files.push(file)
    }
    return files
  }
  async read (path, start, end) {
    const node = await resolve(this.root, path)
    console.log(node)
  }
}

module.exports = (...args) => new Reader(...args)
