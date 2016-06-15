# processingのサンプルコード使用方法

## noteSampleの起動
1. あらかじめProcessing3をインストールしておく
2. noteSample/noteSample.pdeをProcessing3で開く
3. メニューのスケッチからライブラリをインポート、ライブラリを追加を選択
4. 検索窓でoscP5と入力するなどして、Installする
5. noteSample.pdeを実行する

## noteSampleの実行
1. Creators' Hubを開く
2. MIDI鍵盤等の、MIDI入力できるデバイスもしくはアプリケーションを接続する。Creators' Hub接続画面の「接続中のデバイス」に項目追加されていることを確認する。
3. Creators' Hub接続画面の「OSC接続をネットワークに登録する」-「送信先ホストを追加」に以下を入力し、「追加」を押す。Creators' Hub接続画面の「接続中のデバイス」に項目追加されていることを確認する。
 - ホストアドレス：localhost
 - 待ち受けポート番号：立ち上がったプログラムの画面に表示してあるポート番号(24080)
4. Creators' Hub接続画面の「接続中のデバイス」において、2がIN、3がOUTになるマスをクリックし、Connectedにする
5. 2でMIDIのNoteOnを入力すると、3に円が表示される。x方向はノートナンバー、y方向はベロシティに基づき決定する。
