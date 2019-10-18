'use strict'
const assert = require('assert')
const tsame = require('tsame')
const { it } = require('mocha')
const { createTypes } = require('../')
// const Block = require('@ipld/block')

const test = it

const storage = () => {
  const db = {}
  const get = cid => db[cid.toString()]
  const put = async b => {
    db[(await b.cid()).toString()] = b
  }
  return { get, put, db, getBlock: get }
}

const same = (x, y) => assert.ok(tsame(x, y))
const buffer = Buffer.from('hello world')
// const bb = Block.encoder(buffer, 'raw')

const concat = async itr => {
  const buffers = []
  for await (const block of itr) {
    buffers.push(block)
  }
  return Buffer.concat(buffers)
}

test('basic byteLink', async () => {
  const { getBlock, put } = storage()
  const types = createTypes({ getBlock })
  const buffers = [buffer, buffer, buffer]
  let bl
  let blocks = 0
  for await (const { block, root } of types.ByteLinks.fromArray(buffers)) {
    if (block) {
      blocks += 1
      await put(block)
    }
    bl = root
  }
  assert.ok(bl)
  assert.strictEqual(blocks, 3)

  const iter = bl.read()
  const str = (await concat(iter)).toString()
  same(str, Buffer.concat([buffer, buffer, buffer]).toString())
})
