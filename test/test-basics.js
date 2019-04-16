const {test} = require('tap')
const unixfs = require('../src/index')
const path = require('path')
const fs = require('fs').promises

const fixture = path.join(__dirname, 'fixture')

const chunker = unixfs.fixedChunker(1024)

test('dir', async t => {
  let cid
  let counts = {'dag-cbor': 0, 'raw': 0}
  for await (let block of unixfs.dir(fixture, true, chunker)) {
    cid = await block.cid()
    counts[cid.codec] += 1
  }
  t.same(cid.codec, 'dag-cbor')
  t.same(counts.raw, 7)
  t.same(counts['dag-cbor'], 10)
})

const fullFixture = async () => {
  let map = new Map()
  let last
  for await (let block of unixfs.dir(fixture, true, chunker)) {
    last = block
    let cid = await block.cid()
    map.set(cid.toBaseEncodedString(), block)
  }
  return {
    get: async cid => map.get(cid.toBaseEncodedString()),
    cid: await last.cid()
  }
}

const getfile = (...parts) => fs.readFile(path.join(__dirname, 'fixture', ...parts))
const join = async iter => {
  let parts = []
  for await (let buffer of iter) {
    parts.push(buffer)
  }
  return Buffer.concat(parts)
}

test('read', async t => {
  let {get, cid} = await fullFixture()
  let fs = unixfs.fs(cid, get)
  t.same(await join(fs.read('file1')), await getfile('file1'))
  t.same(await join(fs.read('file2')), await getfile('file2'))
  t.same(
    await join(fs.read('dir2/dir3/file3')),
    await getfile('dir2', 'dir3', 'file3')
  )
})

test('ls', async t => {
  let {get, cid} = await fullFixture()
  let fs = unixfs.fs(cid, get)

  let keys = []
  for await (let key of fs.ls('/')) {
    keys.push(key)
  }
  t.same(keys, [ 'bits', 'dir2', 'file1', 'file2', 'small.txt', 'index.html' ])

  keys = []
  for await (let key of fs.ls('/dir2')) {
    keys.push(key)
  }
  t.same(keys, [ 'dir3' ])

  let objects = []
  for await (let object of fs.ls('/', true)) {
    objects.push(object)
  }
  t.same(objects.map(o => o.size), [ 4, 15, 1024, 2048, 11, 15 ])
})
