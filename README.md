# js-unixfsv2

This library is a full implementation of [`unixfs-v2`](https://github.com/ipfs/unixfs-v2) for JavaScript.


Usage:


Usage:

```javascript
const { encoder } = require('unixfsv2')
const blockstore = require('some-block-store')

const storeDirectory = async path => {
  let last
  for await (const block of encoder(__dirname)) {
    await blockstore.put(block)
    last = block
  }
  const cid = await last.cid()
  // return base encoded string of root block CID
  return cid.toString()
}
```
