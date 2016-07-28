# Creators' Hubモジュールサンプル

Creators' HubはMIDI、OSC、JSON等プロトコルの実装を「モジュール」という単位で作成しています。
モジュールの仕様に沿って実装することで対応するプロトコルを増やすことが出来ます。詳細仕様はprg/doc_devのmodules.mdを参照して下さい。

clientSampleは空のモジュールを作成するサンプルになっています。

## 作成したモジュールを追加する方法
1. 環境変数 CREATORS_HUB_MODULES に、ここのディレクトリを設定する
(例)
```
    $ export CREATORS_HUB_MODULES=PATH_TO/example/client_modules/
```
    - これにより client_modules 以下にあるモジュールがロード対象になる

2. Creators'Hubサーバーを起動
```
    $ node server
```

3. ブラウザで localhost:16080 に接続して、INとOUTに以下のポートが表示されていればOK
    - sample> null input
    - sample> null output
