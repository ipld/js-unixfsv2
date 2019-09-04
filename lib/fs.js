const path = require('path')
const file = require('./file')
const { createReadStream, promises } = require('fs')
const fs = promises

const fromFile = async function * (f, stat, opts={}) {
  let iter = createReadStream(f)
  yield * file.fromIter(iter, path.parse(f).base)
}

const fromDirectory = async function * (f, stat, opts={}) {
  
}

const fromFileSystem = async function * (f, opts={}) {
  const stat = await fs.stat(f)
  if (stat.isFile()) {
    yield * fromFile(f, stat, opts)
  } else if (stat.isDirectory()) {
    yield * fromDirectory(f, stat, opts)
  }
}

exports.fromFileSystem = fromFileSystem
exports.fromDirectory = fromDirectory
exports.fromFile = fromFile

  /*
const test = async f => {
  for await (let block of fromFileSystem(f)) {
    console.log(block)
  }
}

test(__dirname + '/parse.js')
*/
