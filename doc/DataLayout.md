

```sh
type LargeFlatByteList struct {
  indexes List
  parts List
}

type ByteLinkArray struct {
  indexes List
  parts List
}

type BytesUnion union {
  | Bytes "bytes"
  | &Bytes "bytesLink"
  | ByteLinkArray "byteLinkArray"
  | LargeFlatByteList "lfbl"
} representation keyed

type DataLayout struct {
  bytes BytesUnion
  size Int
}
