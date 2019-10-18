const gen = require('../../ipld-schema-gen')
const schema = require('./data-layout.json')
const Block = require('@ipld/block')

const readAnything = async function * (selector, node, start=0, end=Infinity) {
  const offsets = (offset, length) => {
    let l = end - offset
    if (l === Infinity || l > length) l = undefined
    let s = start - offset
    if (s < 0) s = 0
    return [s, l]
  }

  const indexes = node.resolve('indexes').decode()
  const parts = node.resolve('parts')
  let i = 0

  for (let [offset, length] of indexes) {
    if (offset >= start) {
      const b = await parts.getNode(i + '/' + selector)
      yield * b.read(...offsets(offset, length))
    }
    i++
  }
}

const readByteLinkArray = (node, start, end) => readAnything('', node, start, end)
const readNestedByteList = (node, start, end) => readAnything('*', node, start, end)

const readBytes = async function * (node, start=0, end) {
  const bytes = await node.getNode('bytes/*')
  yield * bytes.read(start, end)
}

const getLength = node => {
  const indexes = node.resolve('indexes')
  const i = indexes.length - 1
  return indexes[i].value[0].value + indexes[i].value[1].value
}

const advanced  = {
  DataLayout: { read: readBytes, length: node => node.size ? node.size.value : null },
  ByteLinksLayout: { read: readByteLinkArray, length: getLength },
  NestedByteListLayout: { read: readNestedByteList, length: getLength }
}

module.exports = opts => {
  opts = { ...opts, advanced }
  const classes = gen(schema, opts)
  classes.ByteLinks.fromArray = async function * (arr) {
    const parts = []
    const indexes = []
    let offset = 0
    for (let buffer of arr) {
      indexes.push([offset, buffer.length])
      offset += buffer.length
      const block = Block.encoder(buffer, 'raw')
      yield { block }
      parts.push(block.cid())
    }
    yield { root: classes.ByteLinks.encoder({ parts: await Promise.all(parts), indexes } )}
  }
  classes.NestedByteList.flatDag = async function * (arr, maxLength) {
  }
  return classes
}
