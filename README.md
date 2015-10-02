## 起動方法

- npm install
- node server.js

```
================================================
listening web socket on port 16080
connection control at http://localhost:16080/
================================================
```

上記のようなメッセージが表示されるはずなので、
http://localhost:16080/にブラウザからアクセス


## VJとの接続

- VJの受信ポートを待ち受けポート番号に指定して登録する
- ホストアドレスはローカルでチェックする時はlocalhostとすれば良い
- マトリクスにosc: localhost(12345)とosc: localhost(ポート番号)が登録される（12345はサーバからのOSC送信ポート自動登録）
- 楽器行、osc:localhost(ポート）列のチェックを丸にする
- 楽器から送信されたMIDIがVJに送られるはず

## 動作確認環境

### node
- v0.12.7

### npm

- 2.13.2