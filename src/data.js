'use strict'
const gen = require('../../ipld-schema-gen')
const schema = require('./data-layout.json')
const Block = require('@ipld/block')

const readAnything = async function * (selector, node, start = 0, end = Infinity) {
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

  for (const [offset, length] of indexes) {
    if ((offset + length) >= start && offset < end) {
      const b = await parts.getNode(i + '/' + selector)
      yield * b.read(...offsets(offset, length))
    }
    i++
  }
}

const readByteLinkArray = (node, start, end) => readAnything('', node, start, end)
const readNestedByteList = (node, start, end) => readAnything('*', node, start, end)

const readBytes = async function * (node, start = 0, end) {
  const bytes = await node.getNode('bytes/*')
  yield * bytes.read(start, end)
}

const getLength = node => {
  const indexes = node.resolve('indexes').value
  if (!indexes.length) return 0
  const [offset, length] = indexes[indexes.length - 1].encode()
  return offset + length
}

const advanced = {
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
    for (const buffer of arr) {
      const block = write(buffer)
      yield { block }
    }
    const data = await end()
    yield { root: classes.ByteLinks.encoder(data) }
  }
  classes.NestedByteList.flatDag = async function * (arr, maxLength) {
  }
  const defaults = {
    maxListLength: 500,
    algorithm: 'balanced',
    inline: 0
  }
  const balancedDag = async function * (indexes, parts, max, codec) {
    if (indexes.length !== parts.length) {
      throw new Error('index length must match part length')
    }
    indexes = [...indexes]
    parts = [...parts]
    const chunks = []
    const size = Math.floor(indexes.length / max)
    while (indexes.length) {
      chunks.push({
        indexes: indexes.splice(0, size),
        parts: parts.splice(0, size),
        algo: 'balanced'
      })
    }
    for (const chunk of chunks) {
      if (chunk.length > max) {
        for (const _chunk of chunks) {
          let offset = 0
          const _indexes = []
          let _parts = []
          for (const { len, block } of balancedDag(_chunk.indexes, _chunk.parts)) {
            yield { len, block }
            _indexes.push([offset, len])
            _parts.push(block.cid())
            offset += len
          }
          _parts = (await Promise.all(_parts)).map(cid => ({ bu: cid }))
          const union = { nbl: { indexes: _indexes, parts: _parts, algo: 'balanced' } }
          const node = classes.BytesUnion.encoder(union)
          const block = node.block()
          yield { len: offset, block }
        }
      } else {
        let offset = 0
        for (const part of chunk.indexes) {
          part[0] = offset
          offset += part[1]
        }
        const block = classes.BytesUnion.encoder({ nbl: chunk }).block()
        yield { len: offset, block }
      }
    }
  }

  const indexLength = ii => ii[ii.length - 1].reduce((x, y) => x + y)

  classes.Data.writer = (opts = {}) => {
    opts = { ...defaults, ...opts }
    const { write, end } = _writer()
    let first
    const _write = block => {
      if (!first) first = block
      return write(block)
    }
    const _end = async () => {
      const { indexes, parts } = await end()
      if (!indexes.length) return { data: { bytes: Buffer.from('') }, size: 0 }

      const size = indexLength(indexes)

      if (indexes.length === 1) {
        const length = indexes[0][1]
        if (length > opts.inline) {
          return { data: { byteLink: parts[0] }, size }
        } else {
          return { data: { bytes: first.encode() }, size }
        }
      }
      if (indexes.length > opts.maxListLength) {
        const p = parts.map(p => ({ bytes: p }))
        const results = []
        if (opts.algorithm === 'balanced') {
          for await (const result of balancedDag(indexes, p, opts.maxListLength)) {
            results.push(result)
          }
        } else {
          throw new Error(`Not Implemented: algorith (${opts.algorithm})`)
        }
        const last = results.pop()
        const blocks = results.map(r => r.block)
        return { blocks, data: last.block.source(), size }
      } else {
        return { data: { byteLinks: { indexes, parts } }, size }
      }
    }
    return { write: _write, end: _end }
  }
  classes.Data.from = async function * (arr, opts) {
    const { write, end } = classes.Data.writer(opts)
    for (const buffer of arr) {
      yield { block: write(buffer) }
    }
    const union = await end()
    yield * union.blocks.map(u => ({ block: u }))
    delete union.blocks
    yield { root: classes.Data.encoder(union) }
  }
  return classes
}
