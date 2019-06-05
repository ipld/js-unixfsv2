/* globals it */
const Block = require('@ipld/block')
const assert = require('assert')
const unixfs = require('../src/index')
const path = require('path')
const fs = require('fs').promises
const tsame = require('tsame')
const { system, Lookup, read } = require('../')

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
  same(counts.raw, 0) 
  same(counts['dag-cbor'], 1)
})

const fullFixture = async () => {
  let map = new Map()
  let last
  for await (let block of unixfs.dir(fixture, true)) {
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

test('read', async () => {
  let { get, cid } = await fullFixture()
  let fs = unixfs.fs(cid, get)
  same(fs.get('file1').read(), await getfile('file1'))
  same(fs.get('file2').read(), await getfile('file2'))
  same(
    await fs.get('dir2/dir3/file3').read(),
    await getfile('dir2', 'dir3', 'file3')
  )
})

test('ls', async () => {
  let { get, cid } = await fullFixture()
  let fs = unixfs.fs(cid, get)

  let keys = []
  for await (let key of fs.ls('/')) {
    keys.push(key)
  }
  same(keys, [ 'bits', 'dir2', 'file1', 'file2', 'small.txt', 'index.html' ])

  keys = []
  for await (let key of fs.ls('/dir2')) {
    keys.push(key)
  }
  same(keys, [ 'dir3' ])

  // let objects = []
  // for await (let object of fs.ls('/', true)) {
  //   objects.push(object)
  // }
  // same(objects.map(o => o.size), [ 4, 15, 1024, 2048, 11, 15 ])
})
