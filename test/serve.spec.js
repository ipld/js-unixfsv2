/* globals it */
const assert = require('assert')
const unixfs = require('../')
const path = require('path')
const tsame = require('tsame')
const serve = require('../src/serve')
const bent = require('bent')
const http = require('http')

const same = (...args) => assert.ok(tsame(...args))
const test = it

const getreq = bent()

const fixture = path.join(__dirname, 'fixture')

const fullFixture = async () => {
  let map = new Map()
  let cid
  for await (let block of unixfs.dir(fixture, true)) {
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

test('file serving', async () => {
  let { cid, get } = await fullFixture()
  let fs = unixfs.fs(cid.toBaseEncodedString(), get)
  let { url, server } = await getServer(async (req, res) => {
    await serve(fs, req.url, req, res)
  })
  let res = await getreq(url + '/small.txt')
  same(res.headers['content-type'], 'text/plain; charset=utf-8')
  let text = await getText(res)
  same(text, 'small text.')

  let get404 = bent(404)
  res = await get404(url + '/missing')
  same(res.statusCode, 404)

  res = await get404(url + '/dir2')
  same(res.statusCode, 404)

  res = await getreq(url + '/')
  let html = await getText(res)
  same(html, '<html>\n</html>\n')

  res = await getreq(url + '/dir2/dir3')
  html = await getText(res)
  same(html, '<html>\n</html>\n')

  res = await getreq(url + '/bits')
  text = await getText(res)
  same(text, '123\n')

  server.close()
})
