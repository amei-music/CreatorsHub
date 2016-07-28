# Creators' HubにWebSocket+JSONでクライアントを接続する際のメッセージルール

Socket.ioを用いて接続します。

- wsjsonクライアントとしてネットワークに参加する: "join_as_wsjson"
- ネットワークから離脱する: "exit_wsjson"
- JSONメッセージを受信する: "message_json"

join_as_wsjsonを送信します。パラメータとしてnameを送るとその名前でCreators' Hub上に出現します。

```
socket.emit('join_as_wsjson', {name: 'Touch Example'});
```

# 送れるメッセージ

- [midi-json.md](./midi-json.md) --- MIDI-JSON変換ルール
- [osc-json.md](./osc-json.md) --- OSC-JSON変換ルール
