const CID = require('cids')
const iq = require('@ipld/iq')

const fullPath = path => {
  path = path.split('/').filter(x => x)
  if (path.length) path = 'data/' + path.join('/data/')
  else path = ''
  return path
}

class File {
  constructor (root, path, q) {
    this.q = q
    this._q = q(root, fullPath(path))
    this.path = path
    this.root = root
  }
  exists () {
    return this._q.exists()
  }
  ls () {
    return this._q.q('data').keys()
  }
  lsIterator () {
    return this._q.q('data').keyIterator()
  }
  read (start, end) {
    return this._q.q('data').read(start, end)
  }
  length () {
    return this._q.q('data').length()
  }
  readIterator (start, end) {
    return this._q.q('data').readIterator(start, end)
  }
  async isDirectory () {
    let type = await this._q.q('type').toString()
    return type.startsWith('IPFS/Experimental/Dir')
  }
  get (path) {
    if (!this.path.endsWith('/')) path = '/' + path
    return new File(this.root, this.path + path, this.q)
  }
  blocks () {
    return this._q.blocks()
  }
}

class FS {
  constructor (root, _get) {
    this._get = _get
    if (typeof root === 'string') {
      root = new CID(root)
    }
    this.root = root
    this._get = _get
    this.q = iq.defaults({ get: _get })
  }
  get (path) {
    return new File(this.root, path, this.q)
  }
  ls (path) {
    let f = new File(this.root, path, this.q)
    return f.ls()
  }
  lsIterator (path) {
    let f = new File(this.root, path, this.q)
    return f.lsIterator()
  }
}

module.exports = (root, get) => new FS(root, get)
