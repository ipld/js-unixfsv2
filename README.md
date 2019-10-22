# js-unixfsv2

This library is a full implementation of [`unixfs-v2`](https://github.com/ipfs/unixfs-v2) for JavaScript.

## encoder(path, options={})

Async generator that yields blocks for every file and
and directory in the path.

Last block is the root block.

Runs recursively through directories. Accepts any valid
file or directory string path.

```javascript
const { encoder } = require('unixfsv2')
const storage = require('any-key-value-store')

const putBlock = async b => storage.put((await b.cid()).toString(), b.encode())

const storeDirectory = async path => {
  for await (const { block, root } of encoder(__dirname)) {
    await storage.putBlock(block || root.block())
    if (root) return root.block().cid()
  }
}
```

## reader(rootBlock, getBlock)

Returns a new Reader instance for the
root block.

```javascript
const { reader } = require('unixfsv2')
const storage = require('any-key-value-store')
const Block = require('@ipld/block')

const getBlock = async cid => Block.create(await storage.get(cid.toString()), cid)

/* rootBlock would be the same as the last block in
/  encode example.
*/
const r = reader(rootBlock, getBlock)
```


