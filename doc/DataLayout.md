```sh
type Index [Int]
type IndexList [Index]
type ByteUnionList [&BytesUnion]

type NestedByteListLayout struct {
  indexes IndexList
  parts ByteUnionList
  algo String
}

advanced NestedByteListLayout
type NestedByteList bytes representation advanced NestedByteListLayout

type ByteList [&Bytes]

type ByteLinksLayout struct {
  indexes IndexList
  parts ByteList
}

advanced ByteLinksLayout
type ByteLinks bytes representation advanced ByteLinksLayout

type BytesUnion union {
  | Bytes "bytes"
  | &Bytes "bytesLink"
  | ByteLinks "byteLinks"
  | NestedByteList "nbl"
} representation keyed

type DataLayout struct {
  bytes BytesUnion
  size Int
}

advanced DataLayout
type Data bytes representation advanced DataLayout
```
