# MIDIコントローラーからブラウザで音を鳴らす

MIDIコントローラーをCreators' Hubに接続して、WebSocketを受信をするWebAudioAPIを利用した音源を鳴らすサンプルです。

Creators' Hubの起動方法は以下をご確認下さい

- [アプリケーション形式の起動](https://amei-music.github.io/CreatorsHub/document/)（https://amei-music.github.io/CreatorsHub/ からDownloadした場合）
- [ターミナルから起動](../../../README.md)（githubからソースコードをcloneした場合）

## 実行手順

1. Creators' Hubを起動する
2. MIDIコントローラーをPCに繋げる。 ハブの設定画面にMIDIコントローラーが追加されたことを確認する。
3. example/sound/webAudioAPI/index.htmlを2と同じブラウザで開く。ハブの設定画面にjson>webaudioapi_testが追加されたことを確認する。
4. ハブの設定画面でMIDI鍵盤がIN、json>webaudioapi_testがOUTの項目をConnectにする
5. MIDIコントローラーを押すとweb上で音が鳴る
