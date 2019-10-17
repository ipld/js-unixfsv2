const gen = require('ipld-schema-gen')
const data = require('./data.js')
const main = require('./schema.json')

module.exports = opts => {
  opts = { ...opts, advanced: data }
  return gen(main, opts)
}
