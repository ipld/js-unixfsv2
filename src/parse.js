const schema = require('ipld-schema')
const fs = require('fs')

const main = async (input) => {
  return schema.parse(fs.readFileSync(input).toString())
}

module.exports = main
