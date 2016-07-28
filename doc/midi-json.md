# MIDI-JSON変換ルール

Creators' HubでのMIDIとJSONの間の変換ルールです。MIDIメッセージがどのようなJSONメッセージに変換されるか、どのようなJSONメッセージを書けばMIDIに変換されるかを示しています。（現在利用できるメッセージの一覧です。このルールは本リポジトリで議論・検討して仕様を決めて拡張していきます）

### Note On

```
MIDI: [0x9n note_num velocity]
JSON:
{
  "address":"/midi/noteon",
  "args":[ch,note_num,velocity]
}
```

### Note Off

```
MIDI: [0x8n note_num velocity]
JSON:
{
  "address":"midi/noteoff",
  "args":[ch,note_num,velocity]
}
```

### Note Pressure

```
MIDI: [0xAn note_num value]
JSON:
{
  "address":"/midi/notepressure",
  "args":[ch,note_num,value]
}
```

### Control Change

```
MIDI: [0xBn type value]
JSON:
{
  "address":"/midi/controlchange",
  "args":[ch,type,value]
}
```

### Program Change

```
MIDI: [0xCn value]
JSON:
{
  "address":"/midi/programchange",
  "args":[ch,value]
}
```

### Channel Pressure

```
MIDI: [0xDn value]
JSON:
{
  "address":"/midi/channelpressure",
  "args":[ch,value]
}
```

### Pitch Bend

```
MIDI: [0xEn msb lsb]
JSON:
{
  "address":"/midi/pitchbend",
  "args":[ch,msb,lsb]
}
```

### System Exclusive

```
MIDI: [0xF0 value1 value2 value3 ... 0xF7]
JSON:
{
  "address":"/midi/sysex",
  "args":[240, value1, value2, value3, ... , 247]
}
```

### 具体例

以上の記述では、MIDIメッセージ中のnはOSCメッセージのch（チャンネル番号）にあたります。

チャンネルは0から15（16進数で0からF）までの値を取り、その他の値は0から127までを設定できます。以下に具体例を示します。

- Note Onメッセージ
- チャンネル: 15（16進数で表すとF）
- ノートナンバー: 60
- ベロシティ: 100

```
MIDI: [0x9F 60 100]
JSON :
{
  "address":"/midi/noteon",
  "args":[15,60,100]
}
```
