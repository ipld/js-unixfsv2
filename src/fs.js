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
    this._q = q(fullPath(path))
  }
  exists () {
    return this._q.exists()
  }
  ls () {
   this._q.q('data').keys()
  }
  read (start, end) {
    return this._q.q('data').read(start, end)
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
    this.q = iq.defaults({get: _get})
  }
  resolve (value) {
    if (CID.isCID(value)) return this._get(value)
    else return value
  }
  get (path) {
    return new File(this.root, path, this.q)
  }
  ls (path) {
    let f = new File(this.root, path, this.q)
    return f.ls()
  }
}

module.exports = (root, get) => new FS(root, get)
