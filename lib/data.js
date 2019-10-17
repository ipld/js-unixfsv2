const readAnything = async function * (selector, node, start=0, end=Infinity) {
  const { indexes, parts } = node.value
  parts = parts.value
  let i = 0

  const offsets = (offset, length) => {
    let l = end - offset
    if (l === Infinity || l > length) l = undefined
    let s = start - offset
    if (s < 0) s = 0
    return [s, l]
  }

  for (let [offset, length] of indexes.value) {
    offset = offset.value
    length = length.value
    if (offset >= start) {
      const b = await parts[i].getNode(selector)
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

module.exports  = {
  DataLayout: { read: readBytes, length: node => node.size ? node.size.value : null },
  ByteLinks: { read: readByteLinkArray, length: getLength },
  NestedByteListLayout: { read: readNestedByteList, length: getLength }
}
