# speaks.io.js

WebAppからSPEAKSサーバーに接続するためのスクリプト

## WebAppからの使い方

1. HTMLの"socket.io.js"読む箇所を次のように書き換える
```
    <script id="speaks.io" src="./speaks.io.js"></script>
```
    - id="speaks.io" を忘れずに
    - src="./speaks.io.js" はスクリプトの場所に合わせて書き換える
    - このタグの直後に "socket.io.js" が読み込まれる

2. ソケットへのコネクション 
``` javascript
    var socket = speaks.connect();
```
    - 内部は io.connect を行う
    - サーバーのアドレスを指定しなければ localhost:16080 に接続される

## WebAppの実行方法

1. サーバーのアドレスを指定しない場合
```
    file:/// ... /index.html
```
    - localhost:16080 に接続します
     
2. サーバのアドレスを指定する場合
```
    file:/// ... /index.html?server=xxx.xxx.xxx.xxx:16080
```
    - クエリ文字列として ?server=ホスト:ポート で指定

## サンプルプログラム
index.html

1. SPEAKSサーバーを起動

2. file:/// ... /index.html を開く

3. 接続されると connect と表示される

4. SPEAKSサーバーを止めると disconnect と表示される

## 補足
クエリ文字列はパースされて speaks.param に格納される

(例)
```
    file:/// ... /index.html?server=192.168.1.24:16080&foo=bar
```
の場合、
```
    speaks.param = {
        server: "server=192.168.1.24:16080",
        foo:    "bar"
    }
```
のようになっており、WebApp内でも使用可能
