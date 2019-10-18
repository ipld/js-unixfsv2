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
  const _writer = () => {
    const indexes = []
    const parts = []
    let offset = 0
    const write = buffer => {
      indexes.push([offset, buffer.length])
      offset += buffer.length
      const block = Block.encoder(buffer, 'raw')
      parts.push(block.cid())
      return block
    }
    const end = async () => ({ indexes, parts: await Promise.all(parts) })
    return { write, end }
  }
  classes.ByteLinks.fromArray = async function * (arr) {
    const { write, end } = _writer()
    for (let buffer of arr) {
      const block = write(buffer)
      yield { block }
    }
    const data = await end()
    yield { root: classes.ByteLinks.encoder(data) }
  }
  classes.NestedByteList.flatDag = async function * (arr, maxLength) {
  }
  return classes
}
