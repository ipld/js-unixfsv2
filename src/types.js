'use strict'
const gen = require('../../ipld-schema-gen')
const data = require('./data.js')
const main = require('./schema.json')
const attach = require('./file.js')

module.exports = opts => {
  const types = data(opts)
  opts = { ...opts, types }
  const newTypes = { ...types, ...gen(main, opts) }
  attach(newTypes)
  return newTypes
}
