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
  const db = {}
  const counts = { raw: 0, 'dag-json': 0 }
  const { iter, union } = await fs(fixture)
  for await (const block of iter) {
    db[(await block.cid()).toString('base32')] = block
    blocks.push(block)
    counts[block.codec] += 1
  }
  const getBlock = cid => db[cid.toString('base32')] || null
  return { blocks, counts, getBlock, union }
}

test('basic reader', async () => {
  const { blocks, getBlock } = await parse(fixture)
  same(blocks.length, 39)
  const last = blocks[blocks.length - 1]
  const r = reader(last, getBlock)
  const files = await r.ls('/')
  same(files, ['bits', 'dir2', 'file1', 'file2', 'index.html', 'small.txt'])

  const sub = await r.ls('dir2')
  same(sub, ['dir3'])
  same(sub, await r.ls('/dir2'))
})
/*
test('basic data read', async () => {
  const { blocks } = await parse(fixture)
  same(blocks.length, 39)
  const last = blocks[blocks.length - 1]
  const r = reader(last)

  const buffers = []
  const fileReader = r.read('index.html')
  for await (const chunk of fileReader) {
    buffers.push(chunk)
  }
  console.log({buffers})
})

*/
