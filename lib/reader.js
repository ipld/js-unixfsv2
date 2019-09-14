const CID = require('cids')
const Block = require('@ipld/block')

class Reader {
  constructor(root, get) {
    if (Block.isBlock(root)) {
      root = root.decode()
    }
    if (CID.isCID(root)) {
      root = get(root).then(b => b.decode())
    }
    this.root = root
    this.get = get
  }
  async ls (path) {
    path = path.split('/').filter(x => x)

  }
