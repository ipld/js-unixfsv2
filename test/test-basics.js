const {test} = require('tap')
const unixfs = require('../')
const path = require('path')

const fixture = path.join(__dirname, 'fixture')

test('dir', async t => {
  let last
  let counts = {'dag-cbor': 0, 'raw': 0}
  for await (let block of unixfs.dir(fixture, true, 1024)) {
    last = block
    counts[block.cid.codec] += 1
  }
  t.same(last.cid.codec, 'dag-cbor')
  t.same(counts.raw, 3)
  t.same(counts['dag-cbor'], 7)
})
