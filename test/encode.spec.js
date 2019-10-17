'use strict'
const assert = require('assert')
const tsame = require('tsame')
const { it } = require('mocha')
const fs = require('../lib/fs')
const path = require('path')

const test = it

const same = (x, y) => assert.ok(tsame(x, y))

const fixture = path.join(__dirname, 'fixture')

const parse = async p => {
  const blocks = []
  const counts = { raw: 0, 'dag-json': 0 }
  const { iter, union } = await fs(fixture)
  for await (const block of iter) {
    blocks.push(block)
    counts[block.codec] += 1
  }
  return { blocks, counts, union }
}

test('basic encode', async () => {
  const { blocks, counts, union } = await parse(fixture)
  same(union, 'dir')
  same(blocks.length, 39)
  same(counts, { raw: 29, 'dag-json': 10 })
  const last = blocks[blocks.length - 1]
  const root = last.decode()
  same(root.size, 3117)
})
