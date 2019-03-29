const cbor = require('ipld-dag-cbor')
const util = require('util')
const {test} = require('tap')
const unixfs = require('../src/index')
const path = require('path')
const fs = require('fs').promises

const fixture = path.join(__dirname, 'fixture')

const chunker = unixfs.fixedChunker(1024)

test('dir', async t => {
  let last
  let counts = {'dag-cbor': 0, 'raw': 0}
  for await (let block of unixfs.dir(fixture, true, chunker)) {
    last = block
    counts[block.cid.codec] += 1
  }
  t.same(last.cid.codec, 'dag-cbor')
  t.same(counts.raw, 7)
  t.same(counts['dag-cbor'], 10)
})

const fullFixture = async () => {
  let map = new Map()
  let last
  for await (let block of unixfs.dir(fixture, true, chunker)) {
    last = block
    map.set(block.cid.toBaseEncodedString(), block.data)
  }
  return {
    get: async cid => map.get(cid.toBaseEncodedString()),
    cid: last.cid
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

test('find', async t => {
  let {get, cid} = await fullFixture()
  let fs = unixfs.fs(cid, get)

  let [, node] = await fs.find('data/file1')
  t.same(node.size, 1024)

  ;[, node] = await fs.find('data/file2')
  t.same(node.size, 2048)

  ;[, node] = await fs.find('data/dir2/data/dir3/data/file3')
  t.same(node.size, 0)
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
