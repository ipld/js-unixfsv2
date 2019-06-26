const { Node } = require('@ipld/generics')
const defaultConfig = require('./defaults.json')

const _type = 'IPFS/Experimental/File/0'

const _proxy = (method, args, path) => {
  return { call: { method, args, path, proxy: true } }
} 

class File extends Node {
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
  create (args, continuation = {}) {
    /* begin config resolution */
    if (continuation.state = 'getconfig') {
      continuation.config = continuation.result
      continuation.state = null
    }
    if (!continuation.config) {
      if (this.data.config) {
        if (args.configDecode) {
          // config cache is available
          continuation.config = args.configDecode
        }
        continuation.configLink = this.data.config
        continuation.state = 'getconfig'
        return { call: { method: 'get', path: 'config', continuation } } 
      } else {
        let source = merge({}, defaultConfig, args.config)
        return { 
          make: { source },
          continuation: { state: 'config', config: source }
        }
      }
    }
    let config = continuation.config
    let source = args.source
    
    /* end config resolution */
    let mk = { 
      _type, 
      size: source.length,
      meta: args.meta || { }, 
      config: continuation.configLink 
    }
    if (continuation.state === 'finish') {
      return { result: { cid: continuation.cid, size: source.length } }
    }
    if (continuation.state === 'chunker') {
      mk.data = continuation.result.cid
      continuation.state = 'finish'
      return { make: { source: mk }, continuation }
    }
    
    let inline = config.inline.minSize > source.length
    if (inline) {
      mk.data = source
      continuation.state = 'finish'
      return { make: { source: mk }, continuation }
    } else {
      // TODO: select content specifc chunker
      continuation.state = 'chunker'
      let target = { _type: 'IPLD/Experimental/FixedChunker/0' }
      return { call: { method: create, target, args: { source }, composite: true, continuation } }
    }
  }
}
File._type = _type

module.exports = File
