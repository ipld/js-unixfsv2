const gen = require('ipld-schema-gen')
const DataLayout = require('./data.js')
const main = require('./schema.json')

module.exports = opts => {
  opts = Object.assign({}, opts, { advanced: { DataLayout } })
  return gen(main, opts)
}
