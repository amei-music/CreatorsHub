# exampleのフォルダ構成

- [chub.io](./chub.io) --- Creators' Hubに接続する簡易スクリプト
- [client_modules](./client_modules) --- 「モジュール」作成example
- [connection_test](./connection_test) --- JSONクライアントの接続と結線をプログラムから操作するプログラム
- [sound](./sound) --- 音源サンプルプログラム
  - [webAudioAPI](./sound/webAudioAPI) --- WebAudioAPIを用いたシンセプログラム
- [visualize](./visualize) --- ビジュアライズサンプルプログラム
  - [oF](./oF) --- openFrameworksで書かれたサンプル
    - [noteSample](./oF/noteSample) --- 音に合わせて円が表示されるサンプル
    - [oscSequencer](./oF/oscSequencer) --- ステップシーケンサーサンプル
  - [p5](./p5) --- Processingで書かれたサンプル
    - [noteSample](./p5/noteSample) --- 音に合わせて円が表示されるサンプル
    - [oscSequencer](./p5/oscSequencer) --- ステップシーケンサーサンプル
- [webApp](./webApp) --- ウェブページ、ウェブアプリ
  - [node](./webApp/node) --- node.jsで書かれたサンプル群
    - [touchexample](./webApp/node/touchexample) --- タップすると発音情報が送信されるクライアント・サーバーアプリ
  - [index.html](./webApp) --- Socket.ioでCreators' Hubに接続するプログラム
