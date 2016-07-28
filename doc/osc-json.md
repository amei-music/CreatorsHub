# OSC-JSON変換ルール

Creators' HubでのOSCとJSONの間の変換ルールです。現在のところOSCのBundleには対応していません。（このルールは本リポジトリで議論・検討して仕様を決めて拡張していきます）

OSCのアドレスがJSONの"address"、値が"args"に配列として設定されます。

```
OSC
"/myaddress value1 value2 value3"

JSON
{
  "address":"/myaddress",
  "args":[value1, value2, value3]
}
```

OSCメッセージでき引数がない場合は空の配列が送られます。

```
OSC
"/myaddress"

JSON
{
  "address":"/myaddress",
  "args":[]
}
```
