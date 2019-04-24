const { test } = require('tap')
const unixfs = require('../src/index')
const serve = require('../src/serve')
const path = require('path')
const bent = require('bent')
const http = require('http')

const getreq = bent()

const fixture = path.join(__dirname, 'fixture')

const chunker = unixfs.fixedChunker(1024)

const fullFixture = async () => {
  let map = new Map()
  let cid
  for await (let block of unixfs.dir(fixture, true, chunker)) {
    cid = await block.cid()
    map.set(cid.toBaseEncodedString(), block)
  }
  return {
    get: async cid => map.get(cid.toBaseEncodedString()),
    cid
  }
}

let PORT = 2343

let getServer = handler => {
  PORT++
  return new Promise((resolve, reject) => {
    let server = http.createServer(handler)
    server.listen(PORT, () => {
      resolve({ url: `http://localhost:${PORT}`, server })
    })
  })
}

let getText = stream => {
  return new Promise((resolve, reject) => {
    let parts = []
    stream.on('error', reject)
    stream.on('data', chunk => parts.push(chunk))
    stream.on('end', () => {
      resolve(Buffer.concat(parts).toString())
    })
  })
}

test('file serving', async t => {
  let { cid, get } = await fullFixture()
  let fs = unixfs.fs(cid.toBaseEncodedString(), get)
  let { url, server } = await getServer(async (req, res) => {
    await serve(fs, req.url, req, res)
  })
  let res = await getreq(url + '/small.txt')
  t.same(res.headers['content-type'], 'text/plain; charset=utf-8')
  let text = await getText(res)
  t.same(text, 'small text.')

  let get404 = bent(404)
  res = await get404(url + '/missing')
  t.same(res.statusCode, 404)

  res = await get404(url + '/dir2')
  t.same(res.statusCode, 404)

  res = await getreq(url + '/')
  let html = await getText(res)
  t.same(html, '<html>\n</html>\n')

  res = await getreq(url + '/dir2/dir3')
  html = await getText(res)
  t.same(html, '<html>\n</html>\n')

  res = await getreq(url + '/bits')
  text = await getText(res)
  t.same(text, '123\n')

  server.close()
})
