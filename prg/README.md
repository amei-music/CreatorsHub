# 開発環境の作成
このプログラムを修正/開発するにはnode.jsをインストールする必要がある。また、修正後にパッケージ化して配布できるようにするためにelectronを使用する。

## バージョン選択
20160629現在、次のバージョンで開発と動作確認をしている。

- node.js: v6.1.0
- electron-prebuilt: v1.2.1
- electron-rebuild: v1.1.5
- electron-packager: v7.0.3

新しいバージョンセットに移行する際は、[electronのリリース情報](https://github.com/electron/electron/releases)から欲しいelectronのバージョンを決定し、そのリリースノートに書いてあるnode.jsのバージョンを選択すると安全である。

# node.jsのインストールとCreators' Hubプログラムのソースからの実行

1.  node.jsのバージョン管理ツールのインストール

    - Mac
        nodebrewをインストールする。nodebrewとはnode.jsのバージョンを簡単に上げ下げできる補助環境。
        [nodebrew公式のインストール方法](https://github.com/hokaccha/nodebrew)に従う。

    - Windows
	    nodistをインストールする。nodistとはnode.jsのバージョンを簡単に上げ下げできる補助環境。
        [nodist公式のインストール方法](https://github.com/marcelklehr/nodist/)に従う。
        - installer使用推奨

2.  node.jsをインストールする。

    - Mac
        nodebrewを使ってnode.jsをインストールする。
        ```
        nodebrew install-binary v6.1
        nodebrew use v6.1
        ```

    - Windows
        nodistを使ってnode.jsをインストールする。
        ```
        nodist 6.1
        ```

3.  Creators' Hubソースをクローンし、依存しているライブラリをインストールする。ソースを置くディレクトリをここでは```/path/to/workdir/```とする。

    ```
    cd /path/to/workdir/
    git clone https://github.com/amei-music/CreatorsHub.git
    cd ./CreatorsHub/prg/
    npm install
    ```

    一度npm installをすると、./CreatorsHub/prg/node_moduleフォルダができる。これを削除すると未インストールの状態に戻れる。

4.  この時点でソーススクリプトから直接Creators' Hubを起動することができる。

    ```
    cd /path/to/workdir/CreatorsHub/
    node prg/server.js
    ```

5.  ブラウザでserver.jsを実行したマシンのport 16080にアクセスする。
    localhostならhttp://127.0.0.1:16080/ にアクセスする。

# パッケージ作成環境の構築
electronを使ってnode.js+ブラウザを組み込んで単一の実行ファイルにする。

1.  electronをインストールする。

    ```
    npm install -g electron-prebuilt@1.2.1 electron-rebuild@1.1.5 electron-packager@7.0.3
    ```

2.  electronを用いてこのプログラムをパッケージ化する。

    - Mac
        ```
        cd /path/to/workdir/CreatorsHub/prg
        electron-rebuild -m node_modules/ -e ~/.nodebrew/current/lib/node_modules/electron-prebuilt/
        electron ./ # 動作確認
        electron -v # ここで表示されるバージョン数値を下の--version引数に入れる
        electron-packager ./ CreatorsHub --platform=darwin --arch=x64 --version=1.2.1 # Macの場合
        ```

    - Windows
        ```
        cd /path/to/workdir/CreatorsHub/prg
        electron -v # ここで表示されるバージョン数値を下の-v引数および--version引数に入れる
        electron-rebuild -m node_modules/ -v 1.2.1
        electron ./ # 動作確認
        electron-packager ./ CreatorsHub --platform=win32 --arch=ia32 --version=1.2.1 # Windowsの場合
        ```

# Windowsでの注意事項

nodistを使用してnodeをインストールした場合、何も指定しなければ32bit版が選択される。
node_modules/midi にはWindowsネイティブコードが含まれており、32bit版のnodeでは32bitでビルドされるため、electron-packager では --arch=ia32 を指定しないと実行できない。
64bit版にする場合は https://github.com/marcelklehr/nodist/ に従い、環境変数 NODIST_X64=1 としてnodeをインストールし、--arch=x64 でパッケージ作成すればいいと思われる。
    - 但し、64bit版のexeは32bit版Windows上で実行できなくなるため未確認
    - 32bit版のexeは64bit版Windows上でも実行可能
