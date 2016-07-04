# SPEAKSモジュールサンプル

## 概要
空のSPEAKSモジュールです

## テスト方法
1. 環境変数 CREATORS_HUB_MODULES に、ここのディレクトリを設定する
(例)
```
    $ export CREATORS_HUB_MODULES=~foo/bar/example/client_modules/
```
    - これにより client_modules 以下にあるモジュールがロード対象になる
    
2. SPEAKSサーバーを起動
```
    $ node server
```

3. ブラウザで localhost:16080 に接続して、INとOUTに以下のポートが表示されていればOK
    - sample> null input
    - sample> null output
