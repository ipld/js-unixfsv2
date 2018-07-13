const util = require('util')
const cbor = require('ipld-dag-cbor')

const serialize = util.promisify(cbor.util.serialize)
const deserialize = util.promisify(cbor.util.deserialize)

module.exports = {serialize, deserialize}
