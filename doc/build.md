# 開発環境の作成
このプログラムを修正/開発するにはnode.jsをインストールする必要がある。また、修正後にパッケージ化して配布できるようにするためにelectronを使用する。

## バージョン選択
20160602現在、次のバージョンで開発と動作確認をしている。

- node.js: v6.1.0
- electron-prebuilt: v1.2.1
- electron-rebuild: v1.1.5
- electron-packager: v7.0.3

新しいバージョンセットに移行する際は、[electronのリリース情報](https://github.com/electron/electron/releases)から欲しいelectronのバージョンを決定し、そのリリースノートに書いてあるnode.jsのバージョンを選択すると安全である。

# node.jsのインストールとmw1プログラムのソースからの実行

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
    npm rebuild
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
    npm install -g electron-prebuilt@1.2.1 electron-rebuild@1.1.5 electron-packager@7.0.3
    ```

2.  electronを用いてこのプログラムをパッケージ化する。

    ```
    cd path/to/mw1/
    electron-rebuild -m node_modules/ -e ~/.nodebrew/current/lib/node_modules/electron-prebuilt/
    electron ./ # 動作確認
    electron -v # ここで表示されるバージョン数値を下の--version引数に入れる
    electron-packager ./ mw1 --platform=darwin --arch=x64 --version=1.2.1 # Macの場合
    ```
