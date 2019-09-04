const gen = require('ipld-schema-gen')
const def = require('../unixfs.json')

module.exports = gen(def)
