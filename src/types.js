'use strict'
const gen = require('../../ipld-schema-gen')
const data = require('./data.js')
const main = require('./schema.json')

module.exports = opts => {
  const types = data(opts)
  opts = { ...opts, types }
  return { ...types, ...gen(main, opts) }
}
