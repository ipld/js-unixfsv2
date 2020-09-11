import { promises as fs } from 'fs'
import * as hamt from 'hamt-utils'
import fbl from '@ipld/fbl'

/* bit of a hack since it buffers the whole
   file in memory but i don't want to take
   a larger dep that will stream properly.
   eventaully, i'll come back and make this properly stream.
  */
const onemeg = async function * (buffer) {
  let chunk = buffer
  while (chunk.byteLength) {
    yield chunk.subarray(0, 1024 * 1000)
    chunk = chunk.subarray(1024 * 1000)
  }
}

const encode = async function * (Block, path, chunker=onemeg) {
  const stat = await fs.stat(path)
  if (stat.isDirectory()) {
    const files = await fs.readdir(path)
    const dir = {}
    for (const file of files) {
      let last
      for await (const block of encode(Block, new URL(file, path + '/sub'), chunker)) {
        if (last) yield last
        last = block
      }
      dir[file] = last
    }
    let last
    for await (const block of hamt.from(Block, dir)) {
      yield block
      last = block
    }
    yield { content: { d: await last.cid() } }
  } else {
    let last
    for await (const block of fbl.from(chunker(await fs.readFile(path)))) {
      yield block
      last = block
    }
    yield { content: { f: await last.cid() } }
  }
}

const encoder = async function * (Block, path, chunker) {
  let last
  for await (const block of encode(Block, path, chunker)) {
    if (last) yield last
    last = block
  }
  yield Block.encoder(last, 'dag-cbor')
}

const readFile = async function * (reader, parts, start, end) {
  const block = await reader.traverse(parts)
  yield * fbl.read(block, reader.get, start, end)
}

const toString = b => (new TextDecoder()).decode(b)

const lsDirectory = async function * (reader, parts) {
  const block = await reader.traverse(parts)
  const decoded = block.decodeUnsafe()
  if (!decoded.content) throw new Error('Not a valid DirEnt')
  if (!decoded.content.d) throw new Error('Not a file')
  for await (const { key } of hamt.all(decoded.content.d, reader.get, start, end)) {
    yield toString(key)
  }
}

class Reader {
  constructor (head, get) {
    this.head = head
    this.get = get
  }
  async traverse (parts) {
    let head = await this.get(this.head)
    if (!parts.length) {
      const { d, f } = head.decodeUnsafe().content
      return d || f
    }
    while (parts.length) {
      const key = parts.shift()
      const decoded = head.decodeUnsafe()
      if (!decoded.content) throw new Error('Not a valid DirEnt')
      if (!decoded.content.d) throw new Error('Not a directory')
      const dirEnt = await hamt.get(decoded.content.d, key, this.get)
      const { d, f } = dirEnt.content
      if (f && parts.length) throw new Error(`${key} is not a directory`)
      head = await this.get(d || f)
    }
    return head
  }
  read (path='', start, end) {
    path = path.split('/').filter(x => x)
    return readFile(this, path, start, end)
  }
  ls (path='') {
    path = path.split('/').filter(x => x)
    return lsDirectory(this, path)
  }
}

const reader = (...args) => new Reader(...args)

export { encoder, reader }
