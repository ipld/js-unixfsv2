const CID = require('cids')
const { pathLevelZero } = require('@ipld/stack')
const { resolve } = pathLevelZero

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
}

module.exports = (root, get) => new FS(root, get)
