# openFrameworksのサンプルコード使用方法

Creators' Hubを介して、ビジュアルアプリケーションを動かすサンプルです。

Creators' Hubの起動方法は以下をご確認下さい

- [アプリケーション形式の起動](https://amei-music.github.io/CreatorsHub/document/)（https://amei-music.github.io/CreatorsHub/ からDownloadした場合）
- [ターミナルから起動](../../../README.md)（githubからソースコードをcloneした場合）

## 共通のセットアップ

### Macの場合

1. あらかじめXCodeとopenFrameworksをインストールしておく。
   openFrameworksの展開先のフォルダをof_vx.x.x_yyy_releaseとする。
2. このドキュメントにあるnoteSample, oscSeqencerフォルダをof_vx.x.x_yyy_release/apps/myApps/以下に丸ごとコピーする。
3. 上記ディレクトリに移動し、zzz.xcodeprojを開いて、XCodeでビルドする(schemeはzzz debug もしくはzzz releaseを選ぶ)
4. ビルド結果が出来上がるので、それを実行する

### Windowsの場合

Visutal Studio Community 2015での動作を確認しています。セットアップ方法は今後追記します。

## noteSample
1. Creators' Hubを起動する
2. MIDI鍵盤等の、MIDI入力できるデバイスもしくはアプリケーションを接続する。Creators' Hub接続画面の「接続中のデバイス」に項目追加されていることを確認する。
3. Creators' Hub接続画面の「OSC接続をネットワークに登録する」-「送信先ホストを追加」に以下を入力し、「追加」を押す。Creators' Hub接続画面の「接続中のデバイス」に項目追加されていることを確認する。
 - ホストアドレス：localhost
 - 待ち受けポート番号：立ち上がったプログラムの画面に表示してあるポート番号(24080)
4. Creators' Hub接続画面の「接続中のデバイス」において、2がIN、3がOUTになるマスをクリックし、Connectedにする
5. 2でMIDIのNoteOnを入力すると、3に円が表示される。x方向はノートナンバー、y方向はベロシティに基づき決定する。

## oscSequencer
1. Creators' Hubを起動する
2. WebAudioAPIのサンプル等、MIDIを音として出力できるデバイスもしくはアプリケーションを接続する。Creators' Hub接続画面の「接続中のデバイス」に項目追加されていることを確認する。
3. Creators' Hub接続画面の「OSC接続をネットワークに登録する」-「サーバーの受信ポートを追加」-「待ち受けポート番号」に「12345」を入力し、「追加」を押す。Creators' Hub接続画面の「接続中のデバイス」に項目追加されていることを確認する。
4. Creators' Hub接続画面の「接続中のデバイス」において、2がIN、3がOUTになるマスをクリックし、Connectedにする
5. 立ち上がったアプリケーションの画面に表示されている三段の灰色のマスはクリックすると白色に変わる。白いマスと赤いシークバーが重なる時、2から音が鳴る。
