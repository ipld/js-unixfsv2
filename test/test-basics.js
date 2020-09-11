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

    const testDir = async (dir, target) => {
      const ls = await fsAsync.readdir(dir)
      const files = await collect(fs.ls(target))
      same(ls.sort(), files.sort())
      for (const file of files) {
        const u = new URL(file, dir + '/sub')
        const stat = await fsAsync.stat(u)
        if (stat.isDirectory()) {
          await testDir(u, target + '/' + file)
        } else {
          const buffers = await collect(fs.read(target + '/' + file))
          same(await fsAsync.readFile(u), Buffer.concat(buffers))
        }
      }
    }
    await testDir(new URL('fixture', import.meta.url), '')
  })
}
