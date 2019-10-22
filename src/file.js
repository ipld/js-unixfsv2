'use strict'
const bytes = require('bytesish')

const attach = types => {
  const fromIter = async function * (iter, name, opts = {}) {
    const { write, end } = types.Data.writer(opts)
    for await (let chunk of iter) {
      chunk = bytes.native(chunk)
      const block = write(chunk)
      yield { block }
    }
    const data = await end()
    if (data.blocks) {
      for (const block of (data.blocks)) {
        yield { block }
      }
      delete data.blocks
    }

    const file = types.File.encoder({ name, data })
    yield { root: file }
  }
  types.File.fromIter = fromIter
}

module.exports = attach
