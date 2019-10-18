'use strict'
const assert = require('assert')
const tsame = require('tsame')
const { it } = require('mocha')
const { createTypes } = require('../')
const { promisify } = require('util')
const crypto = require('crypto')
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

  let iter = bl.read()
  let str = (await concat(iter)).toString()
  const fixture = Buffer.concat([buffer, buffer, buffer])
  same(str, fixture.toString())
  same(bl.length(), fixture.length)

  iter = bl.read(0, 6)
  str = (await concat(iter)).toString()
  same(str, fixture.slice(0, 6).toString())

  iter = bl.read(15, 18)
  str = (await concat(iter)).toString()
  same(str, fixture.slice(15, 18).toString())
})

const random = () => promisify(crypto.randomBytes)(4)

test('nested byte tree', async () => {
  const { getBlock, put } = storage()
  const types = createTypes({ getBlock })
  let i = 0
  let buffers = []
  while (i < 1000) {
    buffers.push(random())
    i++
  }
  buffers = await Promise.all(buffers)
  const blocks = []
  let nested
  for await (const { block, root } of types.Data.from(buffers, { maxLength: 100 })) {
    if (block) blocks.push(block)
    nested = root
  }
  console.log(blocks.length)
})
