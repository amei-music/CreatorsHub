# Creators' HubにWebSocket+JSONでクライアントを接続する際のメッセージルール

Socket.ioを用いて接続します。

- wsjsonクライアントとしてネットワークに参加する: "join_as_wsjson"
- ネットワークから離脱する: "exit_wsjson"
- JSONメッセージを受信する: "message_json"

join_as_wsjsonを送信する。パラメータとしてnameを送るとその名前でCreators' Hub上に出現する。

# 送れるメッセージの定義
以下の形式を満たすJSONをmessge_jsonで送信すると、ハブは受け取ることができる。

```
{address:'/midi/noteon', args: noteArg}
```

- argsにオブジェクト型を使う場合
- argsに入れらる型: int, float, array int, string, array of float, object

```
socket.emit('join_as_wsjson', {name: 'Touch Example'});
```
