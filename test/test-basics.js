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
    const buffers = await collect(fs.read('small.txt'))
    const local = new URL('fixture/small.txt', import.meta.url)
    same(await fsAsync.readFile(local), Buffer.concat(buffers))
  })
}
