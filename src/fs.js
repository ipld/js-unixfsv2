const CID = require('cids')
const { pathLevelZero } = require('@ipld/stack')
const mime = require('mime-types')
const { resolve, find } = pathLevelZero

class FS {
  constructor (root, _get) {
    this._get = _get
    if (typeof root === 'string') {
      root = new CID(root)
    }
    this.cid = root
    if (root && root.toBaseEncodedString) {
      this.rootBlock = _get(root)
      this.root = this.rootBlock.then(block => {
        if (block.decode) return block.decode()
        throw new Error('Could not lookup block')
      })
    } else {
      throw new Error('Root must be CID.')
    }
  }
  resolve (value) {
    if (CID.isCID(value)) return this._get(value)
    else return value
  }
  ls (path, objects = false) {
    let gen = async function * ls (self, path, objects) {
      path = path.split('/').filter(x => x)
      if (path.length) path = 'data/' + path.join('/data/') + '/data'
      else path = 'data'
      let dir = await resolve(path, await self.rootBlock, self._get)
      for (let key of Object.keys(dir)) {
        if (objects) {
          let file = (await self.resolve(dir[key])).decode()
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
      path = 'data/' + path.split('/').filter(x => x).join('/data/') + '/data'
      let f = await resolve(path, await self.rootBlock, self._get)
      yield * self._reader(f)
    }
    return gen(this, path)
  }
  _reader (f) {
    let gen = async function * _reader (self, f) {
      for (let [, link] of f) {
        if (Buffer.isBuffer(link)) yield link
        else if (link.codec === 'raw') yield (await self.resolve(link)).decode()
        // TODO: Handle nested links
        else throw new Error('Not Implemented')
      }
    }
    return gen(this, f)
  }
  async serve (path, req, res) {
    if (path === '/') path = '/index.html'

    path = 'data/' + path.split('/').filter(x => x).join('/data/')

    let trypath = async (path, block) => {
      let ret
      try {
        ret = await find(path, block, this._get)
      } catch (e) {
        /* istanbul ignore else */
        if (e.message === 'NotFound' || e.message.startsWith('Object has no')) {
          res.statusCode = 404
        } else {
          res.statusCode = 500
        }
        res.end()
        return false
      }
      return ret
    }
    let node = await trypath(path, await this.rootBlock)
    if (!node) return

    if (node.value.type === 'dir') {
      path = node.path + '/data/index.html'
      node = await trypath(path, node.block)
      if (!node) return
    }

    let cid = await node.block.cid()
    let reader = await node.block.reader()
    res.setHeader('Etag', cid.toBaseEncodedString())

    let size = node.value.size
    if (size) res.setHeader('Content-Length', size)
    let contentType = mime.contentType(mime.lookup(path))
    res.setHeader('Content-Type', contentType || 'application/octet-stream')

    res.statusCode = 200
    for await (let buffer of this._reader(reader.get(node.path + '/data').value)) {
      res.write(buffer)
    }
    res.end()
  }
}

module.exports = (root, get) => new FS(root, get)
