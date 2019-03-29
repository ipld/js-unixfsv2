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
  async resolve (path, node) {
    /* path resolver, this allows us to read properties
     * agnostic of block boundaries
     */
    path = path.split('/').filter(x => x)
    let _resolve = async node => {
      if (CID.isCID(node)) {
        let cid = node
        node = await this._get(node)
        if (cid.codec === 'dag-cbor') node = await deserialize(node)
      }
      return node
    }
    node = await _resolve(node)
    while (path.length) {
      let key = path.shift()
      if (!node[key]) throw new Error(`Object has no key named "${key}". ${JSON.stringify(node)}`)
      node = await _resolve(node[key])
    }
    return _resolve(node)
  }
  async _walk (path, type) {
    path = path.split('/').filter(x => x)
    let parent = await this.root
    while (path.length) {
      if (!parent || parent.type !== 'dir') throw new Error('NotFound')
      let key = path.shift()
      if (!parent.data[key]) throw new Error('NotFound')
      parent = await this.resolve(key, parent.data)
    }
    if (!parent || parent.type !== type) throw new Error('NotFound')
    return parent
  }
  ls (path, objects = false) {
    let gen = async function * ls (self, path, objects) {
      let dir = await self._walk(path, 'dir')
      for (let key of Object.keys(dir.data)) {
        if (objects) {
          let file = await self.resolve(key, dir.data)
          yield file
        } else {
          yield key
        }
      }
    }
    return gen(this, path, objects)
  }
  read (path) {
    let gen = async function * read (self, path) {
      let f = await self._walk(path, 'file')
      yield * self._reader(f)
    }
    return gen(this, path)
  }
  _reader (f) {
    let gen = async function * _reader (self, f) {
      for (let [, link] of f.data) {
        if (Buffer.isBuffer(link)) yield link
        else if (link.codec === 'raw') yield self.resolve('', link)
        // TODO: Handle nested links
        else throw new Error('Not Implemented')
      }
    }
    return gen(this, f)
  }
  async find (path) {
    /* returns the value for the given path and the cid of its block */
    path = path.split('/').filter(x => x)
    let cid
    let _resolve = async node => {
      if (CID.isCID(node)) {
        cid = node
        node = await this._get(node)
        if (cid.codec === 'dag-cbor') node = await deserialize(node)
      }
      return node
    }
    let node = await _resolve(this.root)
    while (path.length) {
      let key = path.shift()
      if (!node[key]) throw new Error(`Object has no key named "${key}". ${JSON.stringify(node)}`)
      node = await _resolve(node[key])
    }
    node = await _resolve(node)
    return [cid, node]
  }

  async serve (path, req, res) {
    let cid
    let node

    let tryfind = async () => {
      try {
        let [_cid, _node] = await this.find(path)
        cid = _cid
        node = _node
        return true
      } catch (e) {
        if (e.message === 'NotFound') {
          res.statusCode = 404
          res.end()
        } else {
          res.statusCode = 500
          res.end()
        }
      }
      return false
    }

    path = 'data/' + path.split('/').filter(x => x).join('/data/')
    if (!await tryfind()) return

    if (node.type === 'dir') {
      path += '/data/index.html'
      node = null
      if (!await tryfind()) return
    }
    res.setHeader('Etag', cid.toBaseEncodedString())

    res.setHeader('Content-Length', node.size)
    let contentType = mime.contentType(path.slice(path.lastIndexOf('.')))
    res.setHeader('Content-Type', contentType || 'application/octet-stream')

    res.statusCode = 200
    for await (let buffer of this._reader(node)) {
      res.write(buffer)
    }
    res.end()
  }
}

module.exports = (root, get) => new FS(root, get)
