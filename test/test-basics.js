import Block from '@ipld/block/defaults'
import { encoder, reader } from '../index.js'
import { promises as fsAsync } from 'fs'
import { deepStrictEqual as same } from 'assert'

const store = () => {
  const blocks = {}
  const get = async cid => {
    if (!cid) throw new Error('Not CID')
    if (!blocks[cid.toString()]) throw new Error('not found')
    return blocks[cid.toString()]
  }
  const put = async block => {
    const cid = await block.cid()
    blocks[cid.toString()] = block
  }
  return { get, put }
}

const collect = async iter => {
  const results = []
  for await (const entry of iter) {
    results.push(entry)
  }
  return results
}

export default async test => {
  test('single file', async test => {
    const u = new URL('fixture/small.txt', import.meta.url)
    const { get, put } = store()
    let last
    for await (const block of encoder(Block, u)) {
      last = block
      await put(block)
    }
    const fs = reader(await last.cid(), get)
    const buffers = await collect(fs.read())
    same(await fsAsync.readFile(u), Buffer.concat(buffers))
  })
  test('full directory', async test => {
    const u = new URL('fixture', import.meta.url)
    const { get, put } = store()
    let last
    for await (const block of encoder(Block, u)) {
      last = block
      await put(block)
    }
    const fs = reader(await last.cid(), get)
    let buffers = await collect(fs.read('small.txt'))
    let local = new URL('fixture/small.txt', import.meta.url)
    same(await fsAsync.readFile(local), Buffer.concat(buffers))
    let files = await collect(fs.ls())
    same(files, [ 'small.txt', 'dir2', 'index.html', 'file2', 'file1', 'bits' ])
    files = await collect(fs.ls('dir2'))
    same(files, [ 'dir3' ])
    files = await collect(fs.ls('dir2/dir3'))
    same(files, [ 'file3', 'index.html' ])
    buffers = await collect(fs.read('dir2/dir3/index.html'))
    local = new URL('fixture/dir2/dir3/index.html', import.meta.url)
    same(await fsAsync.readFile(local), Buffer.concat(buffers))
  })
}
