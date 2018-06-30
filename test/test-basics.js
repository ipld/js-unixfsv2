const {test} = require('tap')
const unixfs = require('../')
const path = require('path')
const fs = require('fs').promises

const fixture = path.join(__dirname, 'fixture')

test('dir', async t => {
  let last
  let counts = {'dag-cbor': 0, 'raw': 0}
  for await (let block of unixfs.dir(fixture, true, 1024)) {
    last = block
    counts[block.cid.codec] += 1
  }
  t.same(last.cid.codec, 'dag-cbor')
  t.same(counts.raw, 3)
  t.same(counts['dag-cbor'], 7)
})

const fullFixture = async () => {
  let map = new Map()
  let last
  for await (let block of unixfs.dir(fixture, true, 1024)) {
    last = block
    map.set(block.cid.toBaseEncodedString(), block)
  }
  return {
    get: async cid => map.get(cid.toBaseEncodedString()),
    cid: last.cid
  }
}

const getfile = (...parts) => fs.readFile(path.join(__dirname, 'fixture', ...parts))
const join = async iter => {
  let parts = []
  for await (let block of iter) {
    parts.push(block.data)
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
