# connection_test
Creators'Hubサーバーへの接続を行うサンプルプログラム

## 使い方
1. Creators'Hubサーバープログラムを立ち上げておく

2. ブラウザで以下のファイルを開く
    - １台のPC上で実行する場合
        - file:///PATH_TO/CreatorsHub/example/connection_test/index.html
        - localhost:16080 に接続します
    - サーバがlocalhost以外の場合
        - file:///PATH_TO/CreatorsHub/example/connection_test/index.html?server=xxx.xxx.xxx.xxx:16080
        - ?server=ホスト:ポート で指定

## ボタンの説明

- ボタンに対応する処理は connection_test.js で実装
    - 参照→ index.html

- Create JSON Client
    - JSON入出力ポート作成
    - 参照→ join_as_wsjson()

- Remove JSON Client
    - JSON入出力ポート削除
    - 参照→ exit_wsjson()

- Send NoteOn as JSON
	- JSONポートのINにNoteOnメッセージを送信
    - 参照→ sendNoteOnAsJSON()

    - Send Periodic
        - 繰り返し送信を開始
        - 参照→ sendPeriodicStart()
    - Stop
        - 繰り返し送信を停止
        - 参照→ sendPeriodicStop()

- Disconnect User Clients
    - 入出力ポート間の接続をすべて切る
    - 参照→ disconnectUserClients()

- Remove User Clients
    - Creators'Hubサーバーの入出力ポートをまとめて削除
    - 参照→ removeUserClients()

- Add User Clients
    - Creators'Hubサーバーに入出力ポートを作成（例）
    - 参照→ addUserClients()

- Connect User Clients
    - 入出力ポート間の接続を行う（例）
    - 参照→ connectUserClients()

## connection_test.js

- Creators'Hubサーバーとの接続と初期化については init() を参照
``` javascript
	init: function(server){
        var url = "ws://" + server;
        console.log(url);

        // サーバー接続
		this.socket = io.connect(url);

		// connect - サーバーとの接続通知
		this.socket.on("connect",      this.onConnect.bind(this));

		// disconnect - サーバーとの切断通知
		this.socket.on("disconnect",   this.onDisconnect.bind(this));

		// update_list - ポートの追加削除や接続の更新通知
		this.socket.on("update_list",  this.onUpdateList.bind(this));

		// message_json - JSONメッセージを受信
		this.socket.on("message_json", this.onMessageJson.bind(this));
```

## index.html

- クエリパラメータでCreators'Hubサーバーを指定して socket.io.js を読み込む処理
``` javascript
        var param = {
            // Creators'Hub server address (default)
            server: "localhost:16080"
        };

        // get query parameters
        if(window.location.search.length > 1){
            let query = window.location.search.substring(1);
            let args = query.split('&');
            for(let arg of args){
                let p = arg.split('=');
                param[p[0]] = p[1];
            }
        }

        // append <script> element to load 'socket.io.js' from server
        var server_url = "http://" + param.server + "/socket.io/socket.io.js";
        var s = document.createElement("script");
        s.src = server_url;
        document.head.appendChild(s);
```

- connection_test.js を読み込んで、init にサーバーのアドレスを渡す
``` html
    <script src="./connection_test.js"></script>
    <script type="text/javascript">
        window.onload = function(){
            ctrl.init(param.server);
        }
    </script>
```
