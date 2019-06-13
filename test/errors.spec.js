/* globals it */
const assert = require('assert')
const unixfs = require('../')
const path = require('path')
const tsame = require('tsame')

const same = (...args) => assert.ok(tsame(...args))
const test = it

const fixture = path.join(__dirname, 'fixture')

test('dir', async () => {
  let cid
  let counts = { 'dag-cbor': 0, 'raw': 0 }
  for await (let block of unixfs.dir(fixture, true)) {
    cid = await block.cid()
    counts[cid.codec] += 1
  }
  same(cid.codec, 'dag-cbor')
})

const fullFixture = async () => {
  let map = new Map()
  let cid
  for await (let block of unixfs.dir(fixture, true)) {
    cid = await block.cid()
    map.set(cid.toBaseEncodedString(), block)
  }
  return {
    get: async cid => map.get(cid.toBaseEncodedString()),
    cid: cid
  }
}

test('property missing', async () => {
  let { get, cid } = await fullFixture()
  let fs = unixfs.fs(cid, get)
  try {
    await fs.get('/missing').read()
    assert(false)
  } catch (e) {
    assert(e.message.toLowerCase().startsWith('not found'))
  }
})
