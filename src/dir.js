const { Node } = require('@ipld/generics')
const defaultConfig = require('./defaults.json')

const _type = 'IPFS/Experimental/Dir/0'

const _proxy = (method, args, path) => {
  return { call: { method, args, path, proxy: true } }
} 

class Dir extends Node {
  read (args) {
    return _proxy('read', args, 'data')
  }
  length (args) {
    return _proxy('length', args, 'data')
  }
  get (args) {
    return _proxy('get', args, 'meta')
  }
  set (args) {
    return _proxy('set', args, 'meta')
  }
  all (args) {
    return _proxy('all', args, 'meta')
  }
  create (args) {
    /* begin config resolution */
    if (continuation.state = 'getconfig') {
      continuation.config = continuation.result
      continuation.state = null
    }
    if (!continuation.config) {
      if (this.data.config) {
        continuation.configLink = this.data.config
        if (args.configDecode) {
          // config cache is available
          continuation.config = args.configDecode
        } else {
          continuation.state = 'getconfig'
          return { call: { method: 'get', path: 'config', continuation } }
        } 
      } else {
        let source = merge({}, defaultConfig, args.config)
        return { 
          make: { source },
          continuation: { state: 'config', config: source }
        }
      }
    }
    let config = continuation.config
    /* end config resolution */
    
    // TODO: use a HAMT when files are over a particular size
    let source = { _type, files: args.files, meta: args.meta || {}, size: args.size }
    source.config = continuation.configLink
    return { make: { source }, proxy: true }
  }
}
Dir._type = _type

module.exports = Dir
