'use strict'
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

const readIterator = async function * (reader, path, start, end) {
  const data = await reader.get(path, 'data')
  yield * data.read(start, end)
}

class Reader {
  constructor (root, get) {
    this.types = createTypes({ getBlock: get })
    if (Block.isBlock(root)) {
      root = this.types.Directory.decoder(root.decode())
    }
    if (typeof root === 'string') root = new CID(root)
    if (CID.isCID(root)) {
      root = get(root).then(b => this.types.Directory.decoder(b.decode()))
    }
    this.root = root
    this.getBlock = get
  }

  async ls (path) {
    const root = await this.root
    const files = []
    path = [].concat(buildPath(path), ['data', '*']).join('/')
    const node = await root.getNode(path)
    const keys = node.keys()
    for await (const file of keys) {
      files.push(file)
    }
    return files
  }

  async get (path, ...props) {
    const root = await this.root
    path = [...buildPath(path), ...props]
    const file = await root.getNode(path.join('/'))
    return file
  }

  read (path, start, end) {
    return readIterator(this, path, start, end)
  }
}

module.exports = (...args) => new Reader(...args)
