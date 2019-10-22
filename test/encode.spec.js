'use strict'
const assert = require('assert')
const tsame = require('tsame')
const { it } = require('mocha')
const { encoder } = require('../')
const path = require('path')

const test = it

const same = (x, y) => assert.ok(tsame(x, y))

const fixture = path.join(__dirname, 'fixture')

const parse = async p => {
  const blocks = []
  const counts = { raw: 0, 'dag-cbor': 0 }
  const iter = await encoder.fromFileSystem(fixture)
  for await (let { block, root } of iter) {
    if (root) {
      block = root.block()
      same(root.constructor.name, 'Directory')
    }
    blocks.push(block)
    counts[block.codec] += 1
  }
  return { blocks, counts }
}

test('basic encode', async () => {
  const { blocks, counts } = await parse(fixture)
  same(blocks.length, 39)
  same(counts, { raw: 29, 'dag-cbor': 10 })
  const last = blocks[blocks.length - 1]
  const root = last.decode()
  same(root.size, 3117)
})
