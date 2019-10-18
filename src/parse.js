'use strict'
const schema = require('ipld-schema')
const { readFile } = require('fs').promises

const main = async (input) => {
  return schema.parse((await readFile(input)).toString())
}

module.exports = main
