const CID = require('cids')
const Block = require('ipfs-block')
const mime = require('mime-types')

const {deserialize} = require('./cbor')

class FS {
  constructor (root, _get) {
    this._get = _get
    if (typeof root === 'string') {
      root = new CID(root)
    }
    this.cid = root
    if (root.toBaseEncodedString) {
      this.rootBuffer = _get(root)
      this.rootBlock = this.rootBuffer.then(buffer => {
        return new Block(buffer, this.cid)
      })
      this.root = this.rootBuffer.then(buffer => {
        return deserialize(buffer)
      })
    } else {
      throw new Error('Root must be CID.')
    }
  }
  async _walk (path, type) {
    path = path.split('/').filter(x => x)
    let parent = await this.root
    while (path.length) {
      if (!parent || parent.type !== 'dir') throw new Error('NotFound')
      let key = path.shift()
      if (!parent.data[key]) throw new Error('NotFound')
      let cid = new CID(parent.data[key]['/'])
      parent = await deserialize((await this._get(cid)))
    }
    if (!parent || parent.type !== type) throw new Error('NotFound')
    return parent
  }
  ls (path, objects = false) {
    let self = this
    return (async function * () {
      let dir = await self._walk(path, 'dir')
      for (let key of Object.keys(dir.data)) {
        if (objects) {
          let block = await self._get(new CID(dir.data[key]['/']))
          yield deserialize(block)
        } else {
          yield key
        }
      }
    })()
  }
  read (path) {
    let self = this
    return (async function * () {
      let f = await self._walk(path, 'file')
      for (let link of f.data) {
        let cid = new CID(link['/'])
        let buffer = await self._get(cid)
        yield new Block(buffer, cid)
      }
    })()
  }
  async block (path) {
    path = path.split('/').filter(x => x)
    let block = await this.rootBlock
    while (path.length) {
      let key = path.shift()
      let node = await deserialize(block.data)
      if (!node.data[key]) throw new Error('NotFound')
      let cid = new CID(node.data[key]['/'])
      block = new Block(await this._get(cid), cid)
    }
    return block
  }
  async serve (path, req, res) {
    let block

    let tryblock = async () => {
      try {
        block = await this.block(path)
      } catch (e) {
        if (e.message === 'NotFound') {
          res.statusCode = 404
          res.end()
        } else {
          res.statusCode = 500
          res.end()
        }
      }
    }

    await tryblock()
    if (!block) return
    let node = await deserialize(block.data)
    if (node.type === 'dir') {
      if (!path.endsWith('/')) path += '/'
      path += 'index.html'
      block = null
      await tryblock()
      if (!block) return
      node = await deserialize(block.data)
    }

    res.setHeader('Etag', block.cid.toBaseEncodedString())

    res.setHeader('Content-Length', node.size)
    let contentType = mime.contentType(path.slice(path.lastIndexOf('.')))
    res.setHeader('Content-Type', contentType || 'application/octet-stream')

    res.statusCode = 200
    for (let link of node.data) {
      let cid = new CID(link['/'])
      let buffer = await this._get(cid)
      res.write(buffer)
    }
    res.end()
  }
}

module.exports = (root, get) => new FS(root, get)
