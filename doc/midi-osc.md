# MIDI-OSC変換ルール

Creators' HubでのMIDIとOSCの間の変換ルールです。MIDIメッセージがどのようなOSCメッセージに変換されるか、どのようなOSCメッセージを書けばMIDIに変換されるかを示しています。 （現在利用できるメッセージの一覧です。このルールは本リポジトリでオープンに議論・検討して仕様を決めて拡張していきます）

### Note On
```
MIDI: [0x9n note_num velocity]
OSC : /midi/noteon/ ch note_num velocity
```

### Note Off
```
MIDI: [0x8n note_num velocity]
OSC : /midi/noteoff/ ch note_num velocity
```

### Note Pressure
```
MIDI: [0xAn note_num value]
OSC : /midi/notepressure ch note_num value
```

### Control Change

```
MIDI: [0xBn type value]
OSC : /midi/controlchange ch type value
```

### Program Change

```
MIDI: [0xCn value]
OSC : /midi/programchange ch value
```

### Channel Pressure

```
MIDI: [0xDn value]
OSC : /midi/channelpressure ch value
```

### Pitch Bend

```
MIDI: [0xEn msb lsb]
OSC : /midi/pitchbend ch msb lsb
```

### System Exclusive

```
MIDI: [0xF0 value1 value2 value3 ... 0xF7]
OSC : /midi/sysex 240 value1 value2 value3 … 247
```

以上の記述では、MIDIメッセージ中のnはOSCメッセージのch（チャンネル番号）にあたります。

チャンネルは0から15（16進数で0からF）までの値を取り、その他の値は0から127までを設定できます。以下に具体例を示します。

- Note Onメッセージ
- チャンネル: 15（16進数で表すとF）
- ノートナンバー: 60
- ベロシティ: 100

```
MIDI: [0x9F 60 100]
OSC : /midi/noteon/ 15 60 100
```
