# UnixFSv2 Schema

This doc contains the File and Directory schemas with reference
to the following advanced layouts:

* [DataLayout](./DataLayout.md)
* Hamt

```sh
type Files union {
  | Map "map"
  | Hamt "hamt"
} representation keyed

type FileUnion union {
  | File "file"
  | &File "fileLink"
} representation keyed

# type Hamt {String:FileUnion}<HAMT>

# advanced HAMT {
#   implementation "IPLD/experimental/HAMT/v1"
# }

type Directory struct {
  name optional String
  size optional Int
  files Files
}

advanced DataLayout

type Data bytes representation advanced DataLayout

type Permissions struct {
  uid Int
  gid Int
  posix Int # The standard 0777 bitpacking masks

  sticky Bool (implicit "false")
  setuid Bool (implicit "false")
  setgid Bool (implicit "false")
}

type Attributes struct {
  mtime optional Int
  atime optional Int
  ctime optional Int
  mtime64 optional Int
  atime64 optional Int
  ctime64 optional Int

  permissions optional Permissions

  devMajor optional Int
  devMinor optional Int
}

type File struct {
  name optional String
  data optional Data
  size optional Int
}
```
