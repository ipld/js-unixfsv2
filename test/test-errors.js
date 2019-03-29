const {test} = require('tap')
const unixfs = require('../src/index')
const path = require('path')

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

test('invalid cid', async t => {
  let {get} = await fullFixture()
  try {
    unixfs.fs(null, get)
  } catch (e) {
    t.same(e.message, 'Root must be CID.')
  }
})

test('property missing', async t => {
  let {get, cid} = await fullFixture()
  let fs = unixfs.fs(cid, get)
  try {
    await fs.resolve('/missing', await fs.root)
  } catch (e) {
    t.ok(e.message.startsWith('Object has no key named "missing"'))
  }
})

test('walk notfound', async t => {
  let {get, cid} = await fullFixture()
  let fs = unixfs.fs(cid, get)

  try {
    await fs._walk('/missing', 'file')
  } catch (e) {
    t.same(e.message, 'NotFound')
  }

  try {
    await fs._walk('/small.txt/missing', 'file')
  } catch (e) {
    t.same(e.message, 'NotFound')
  }

  try {
    await fs._walk('/small.txt', 'dir')
  } catch (e) {
    t.same(e.message, 'NotFound')
  }
})

test('find notfound', async t => {
  let {get, cid} = await fullFixture()
  let fs = unixfs.fs(cid, get)

  try {
    await fs.find('/missing', await fs.root)
  } catch (e) {
    t.ok(e.message.startsWith('Object has no key named "missing"'))
  }
})
