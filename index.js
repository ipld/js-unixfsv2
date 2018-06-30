const cbor = require('ipld-dag-cbor')
const util = require('util')
const streamChunker = require('stream-chunker')
const fs = require('fs')
const {PassThrough} = require('stream')
const Block = require('ipfs-block')
const CID = require('cids')
const multihashes = require('multihashes')
const crypto = require('crypto')
const path = require('path')
const mime = require('mime-types')

const {stat, readdir} = fs.promises

const serialize = util.promisify(cbor.util.serialize)
const deserialize = util.promisify(cbor.util.deserialize)

const sha2 = b => crypto.createHash('sha256').update(b).digest()

const mkblock = (buffer, type) => {
  let hash = multihashes.encode(sha2(buffer), 'sha2-256')
  let cid = new CID(1, type, hash)
  return new Block(buffer, cid)
}

const mkcbor = async obj => {
  return mkblock(await serialize(obj), 'dag-cbor')
}

const onemeg = 1000000

const file = (path, chunkSize = onemeg) => {
  let stream = fs.createReadStream(path)
  return (async function * () {
    let chunker = stream.pipe(streamChunker(chunkSize))
    let reader = chunker.pipe(new PassThrough({objectMode: true}))

    let parts = []
    let size = 0

    for await (let chunk of reader) {
      let block = mkblock(chunk, 'raw')
      parts.push(block.cid)
      yield block
      size += chunk.length
    }
    let f = {
      size,
      type: 'file',
      data: parts.map(cid => {
        return {'/': cid.toBaseEncodedString()}
      })
    }
    yield await mkcbor(f)
  })()
}

const dir = (_path, recursive = true, chunkSize = onemeg) => {
  return (async function * () {
    let files = await readdir(_path)
    let size = 0
    let data = {}
    for (let name of files) {
      let fullpath = path.join(_path, name)
      let _stat = await stat(fullpath)

      let reader
      if (_stat.isDirectory() && recursive) {
        reader = dir(fullpath, true, chunkSize)
      } else {
        reader = file(fullpath, chunkSize)
      }

      let last
      for await (let block of reader) {
        yield block
        last = block
      }

      data[name] = {'/': last.cid.toBaseEncodedString()}
      size += deserialize(last.data).size
    }
    yield await mkcbor({size, data, type: 'dir'})
  })()
}

exports.file = file
exports.dir = dir
exports.fs = (root, get) => new FS(root, get)

class FS {
  constructor (root, _get) {
    this._get = _get
    if (typeof root === 'string') {
      root = new CID(root)
    }
    this.cid = root
    if (root.toBaseEncodedString) {
      this.root = _get(root).then(block => {
        this.rootBlock = block
        return deserialize(block.data)
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
      parent = await deserialize((await this._get(cid)).data)
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
          yield deserialize(block.data)
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
        let block = await self._get(new CID(link['/']))
        yield block
      }
    })()
  }
  async block (path) {
    path = path.split('/')
    await this.root
    let block = this.rootBlock
    while (path.length) {
      let key = path.shift()
      let node = await deserialize(block.data)
      if (!node.data[key]) throw new Error('NotFound')
      block = await this._get(new CID(node.data[key]['/']))
    }
    return block
  }
}

const serve = (root, get) => {
  let f = new FS(root, get)
  return async (req, res) => {
    let path = req.url
    if (path.endsWith('/')) path += 'index.html'

    let block
    try {
      block = await f.block(path)
    } catch (e) {
      if (e.message === 'NotFound') {
        res.statusCode = 404
        res.end()
        return
      } else {
        res.statusCode = 500
        res.end()
        console.error(e)
        return
      }
    }
    let node = await deserialize(block.data)
    res.setHeader('Content-Length', node.size)
    res.setHeader('Etag', block.cid.toBaseEncodedString())
    res.setHeader('Content-Type', mime.contentType(path) || 'application/octet-stream')

    res.statusCode = 200

    for (let link of node.data) {
      block = await get(new CID(link['/']))
      res.write(block.data)
    }
    res.end()
  }
}

exports.serve = serve
