const mime = require('mime-types')

const last = arr => arr.slice(-1)[0]

module.exports = async (fs, path, req, res) => {
  if (path === '/') path = '/index.html'
  let file = fs.get(path)

  let notfound = () => {
    res.statusCode = 404
    res.end()
  }

  if (!await file.exists()) return notfound()
  if (await file.isDirectory()) {
    file = file.get('index.html')
  }
  if (!await file.exists()) return notfound()

  let block = last(await file.blocks())
  let cid = await block.cid()

  res.setHeader('Etag', cid.toBaseEncodedString())

  let size = await file.length()
  res.setHeader('Content-Length', size)
  let contentType = mime.contentType(mime.lookup(file.path))
  res.setHeader('Content-Type', contentType || 'application/octet-stream')

  res.statusCode = 200
  for await (let buffer of file.readIterator()) {
    res.write(buffer)
  }
  res.end()
}
