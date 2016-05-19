# 開発環境の作成
このプログラムを修正/開発するにはnode.jsをインストールする必要がある。
20160519現在、electron(後述)がv1.1.0で、このelectronに内包されるnode.jsのバージョンが6.1.0なので、node.jsもv6.1.0で揃えておく。

1.  nodebrewをインストールする。nodebrewとはnode.jsのバージョンを簡単に上げ下げできる補助環境。
    [nodebrew公式のインストール方法](https://github.com/hokaccha/nodebrew)に従う。

2.  nodebrewを使ってnode.jsをインストールする。

    ```
    nodebrew install-binary v6.1
    nodebrew use v6.1
    ```

3.  このプログラムが依存しているライブラリをインストールする。20160519現在、node.jsのバージョンを6.1とすると、一部依存モジュールのバージョン指定変更が必要。

    ```
    cd path/to/mw1/
    rm -r node_modules/
    npm install midi usage --force # midiとusageモジュールでビルドエラーが発生するが、強制的に最後まで進める
    vi node_modules/midi/package.json # nanというモジュールのバージョン表記を2.05 -> 2.2に変更
    vi node_modules/usage/package.json　# nanというモジュールのバージョン表記を2.09 -> 2.2に変更
    npm install
    ```

4.  この時点でソーススクリプトから直接mw1を起動することができる。

    ```
    cd path/to/mw1
    node server.js
    ```

# パッケージ作成環境の構築
electronを使ってnode.js+ブラウザを組み込んで単一の実行ファイルにする。

1.  electronをインストールする。

    ```
    npm install -g electron-prebuilt electron-packager electron-rebuild
    ```

2.  electronを用いてこのプログラムをパッケージ化する。

    ```
    cd path/to/mw1/
    electron-rebuild -m node_modules/ -e ~/.nodebrew/current/lib/node_modules/electron-prebuilt/
    electron ./index_electron.js # 動作確認
    electron -v # ここで表示されるバージョン数値を下の--version引数に入れる
    electron-packager ./index_electron.js mw1 --platform=darwin --arch=x64 --version=1.1.0 # Macの場合
    ```
