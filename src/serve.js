const mime = require('mime-types')
const { pathLevelZero } = require('@ipld/stack')
const { find } = pathLevelZero

module.exports = async (fs, path, req, res) => {
  if (path === '/') path = '/index.html'

  path = 'data/' + path.split('/').filter(x => x).join('/data/')

  let trypath = async (path, block) => {
    let ret
    try {
      ret = await find(path, block, fs.get(path))
    } catch (e) {
      /* istanbul ignore else */
      if (e.message === 'NotFound' || e.message.startsWith('Object has no')) {
        res.statusCode = 404
      } else {
        res.statusCode = 500
      }
      res.end()
      return false
    }
    return ret
  }
  let node = await trypath(path, await fs.rootBlock)
  if (!node) return

  if (node.value.type === 'dir') {
    path = node.path + '/data/index.html'
    node = await trypath(path, node.block)
    if (!node) return
  }

  let cid = await node.block.cid()
  let reader = await node.block.reader()
  res.setHeader('Etag', cid.toBaseEncodedString())

  let size = node.value.size
  if (size) res.setHeader('Content-Length', size)
  let contentType = mime.contentType(mime.lookup(path))
  res.setHeader('Content-Type', contentType || 'application/octet-stream')

  res.statusCode = 200
  for await (let buffer of fs._reader(reader.get(node.path + '/data').value)) {
    res.write(buffer)
  }
  res.end()
}
