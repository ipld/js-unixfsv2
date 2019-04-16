const {test} = require('tap')
const unixfs = require('../src/index')
const path = require('path')

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
})

const fullFixture = async () => {
  let map = new Map()
  let cid
  for await (let block of unixfs.dir(fixture, true, chunker)) {
    cid = await block.cid()
    map.set(cid.toBaseEncodedString(), block)
  }
  return {
    get: async cid => map.get(cid.toBaseEncodedString()),
    cid: cid
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
    await fs.resolve('/missing', fs.cid)
  } catch (e) {
    t.ok(e.message.startsWith('Object has no key named "missing"'))
  }
})
