# これは何？
mw1はマルチモーダルな創作活動を加速するためのソフトウェアフレームワークです。
音楽に連動して映像を操作したり、IoTデバイスから楽器や照明をコントロールすると行った創作を行う際の手間を軽減することを目的としています。
このようなマルチモーダルな創作では、複数のアプリケーションや複数の通信プロトコル間でのデータのやり取りが欠かせません。
現在、音楽製作に適したソフトウェア、照明機器を多数接続コントロールする通信プロトコルなど、各領域においての創作を加速させるためのシステムは多数存在していますが、それらを組み合わせて1つの大きなシステムにするには、物理的な通信経路の接続や、データフォーマットの相互変換、データのスケール変換など、「本来やりたい部分ではない」課題が多数あります。

mw1の実体は、以下の仕組みを提供するための仕様の集まりと、それを実装したサーバープログラムです。

- 通信プロトコル、データフォーマットの相互変換: 20160512現在、MIDI, rtp-MIDI, Open Sound Control, Web Socketを流れる特定形式のJSON, 等のメッセージを受け取り、ユーザー指定の出力先に出力先のプロトコル、データフォーマットで送信する
- Webページによる接続設定: mw1に接続しているどの入力からどの出力へメッセージを引き渡すかをWebブラウザから設定する
- データの加工: 簡単なJavaScriptを書くことで、ある入力からある出力に送るメッセージを加工することができる

![screenshot](doc/screenshot.png)



# 誰のため？
mw1は例えば以下のようなユーザー、シチュエーションに対して役に立つシステムを目指して開発しています。

- プログラミングで映像を作り出すVJが、オーディエンスのスマートフォン操作によって映像をコントロールさせてみる
- スマートフォンアプリやWebの開発ができる人が、その知識を使って本物の電子楽器を扱う
- 新しいIoTセンサーの開発者が、製品紹介のためにセンサーに音や映像照明が連動するデモンストレーションを行う


# どれくらいのものができる？

mw1を使うことで、たとえば次のような作品を簡単なシステムで作れるようになります。

![SOUND & CITY](doc/sac.png)

これは加速度や圧力などのセンサーを仕込んだ靴を履いて足を振ったりジャンプしたりすることで、音楽や照明をコントロールできるようにした展示です。Bluetooth Low Energyを利用して無線でコンピューターに靴のセンサー情報を送り、これをmw1のプログラムが受け取ります。mw1はこの情報を、音楽シーケンサー用のプロトコル(MIDI)上のメッセージと照明機材用のプロトコル(DMX)上のメッセージに変換してそれぞれに引き渡すことで、構成全体で同じ通信プロトコルを"話す"ことなしに作品を動かすことができます。


# 用語定義



# 使用方法概要
- このプログラムの本体をダウンロードする
- マルチモーダル創作に使いたいアプリケーション、ハードウェア等を用意する
- このプログラムと創作用のアプリ等を起動し、このプログラムに接続する


# mw1起動方法
## プログラムの取得と動かし方
1.  node本体をインストールする。nodebrewを使ったりソースから直接ビルドしたり。
    詳しくはWebで最新情報を検索すればOK。
2.  このソースを適当な場所にgit cloneする。

    ```
    cd /path/to/your/working/dir
    git clone {this repository URL}
    ```

3.  そのままこのディレクトリで依存パッケージのインストール

    ```
    npm install
    ```

4.  サーバー側起点であるserver.jsをnodeで実行

    ```
    node server.js
    ```

    このとき、下記のようなメッセージがconsoleに出ていれば正常起動している。
    http://localhost:16080/ にブラウザからアクセスすればコネクション画面が出る。

    ```
    ================================================
    listening web socket on port 16080
    connection control at http://localhost:16080/
    ================================================
    ```


5.  ブラウザでserver.jsを実行したマシンのport 16080にアクセスする。
    localhostならhttp://127.0.0.1:16080/にアクセスする。


## 仕様 (Dictionaryと呼ばれている部分 + α)
- MIDIに変換されるjsonのフォーマット
- MIDIに変換されるOSCのフォーマット (最近今の書式から変えたいと思ってきた/詳細別途共有します)
- 対応フォーマット種類
- 接続管理に関する部分

## プロトコル変換の実装にまつわる部分
- Node.jsで書かれているということ (nodebrewからの簡単なインストールガイドを別ファイルで書いておきたい)
- サーバーサイドJavaScript上で実装される内部フォーマット(OSCライクなあれに全プロトコルが一度揃えられる、的な概念部分)

## データ変換の実装にまつわる部分(future workなので後回しでもOK、ただし実装は随時)

## 権利的な部分
- ライセンス
- コピーライト
- 免責
- 依存ライブラリのライセンスの吸い上げ (必須)
