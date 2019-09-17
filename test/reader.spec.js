'use strict'
const assert = require('assert')
const tsame = require('tsame')
const { it } = require('mocha')
const fs = require('../lib/fs')
const path = require('path')
const reader = require('../lib/reader')

const test = it

const same = (x, y) => assert.ok(tsame(x, y))

const fixture = path.join(__dirname, 'fixture')

const parse = async p => {
  const blocks = []
  const counts = { raw: 0, 'dag-json': 0 }
  for await (const block of fs(fixture)) {
    blocks.push(block)
    counts[block.codec] += 1
  }
  return { blocks, counts }
}

test('basic reader', async () => {
  const { blocks } = await parse(fixture)
  same(blocks.length, 39)
  const last = blocks[blocks.length - 1]
  const r = reader(last)
  const files = await r.ls('/')
  same(files, ['bits', 'dir2', 'file1', 'file2', 'index.html', 'small.txt'])
})
