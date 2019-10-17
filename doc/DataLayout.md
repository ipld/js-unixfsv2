```sh
type Index [Int]
type IndexList [Index]
type PartList [&PartUnion]

type PartUnion union {
  | &BytesUnion "bu"
  | &Bytes "bytes"
} representation keyed

type NestedByteListLayout struct {
  indexes IndexList
  parts PartList
}

advanced NestedByteListLayout
type NestedByteList bytes representation advanced NestedByteListLayout

type ByteList [&Bytes]

type ByteLinks struct {
  indexes IndexList
  parts ByteList
}

advanced ByteLinks
type ByteLinkArray bytes representation advanced ByteLinks

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
