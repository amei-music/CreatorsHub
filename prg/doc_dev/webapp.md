# WebアプリからCreators' Hubサーバーへの接続方法
WebアプリからCreators' Hubサーバーへの接続方法とAPIの説明です。

==================================================================
## WebSocket接続

------------------------------------
### 直接 socket.io.js を読み込む場合
1. index.htmlで socket.io.js を読み込む
```
	<script src="http://CreatorsHubサーバーのホスト名:ポート/socket.io/socket.io.js"></script>
```

2. ソケット接続
```
    var url = 'ws://CreatorsHubサーバーのホスト名:ポート';
    var socket = io.connect(url);
```

------------------------------------
### CreatorsHub.io を使用する場合
example/CreatorsHub.io に、WebAppのクエリ文字列としてCreators' Hubサーバーを指定して、socket.io.jsの読み込みと接続を行うためのスクリプトを用意してあります。

- 使い方
    - example/CreatorsHub.io/README.md を参照
- サンプル
    - example/connection_test を参照

==================================================================
## Creators' Hubサーバー→WebAppへの通知

------------------------------------
### サーバー接続状態通知

#### connect
    - サーバーとの接続通知
```
		socket.on("connect", function(){
            // 接続時の処理（任意）
        });
```

#### disconnect
    - サーバーとの切断通知
```
		socket.on("disconnect", function(){
            // 切断時の処理（任意）
        });
```

------------------------------------
### 入出力ポート接続状態通知

#### update_list
    - ポートの追加削除や接続の更新通知
```
        socket.on("update_list", function(obj){
            // 接続情報更新時の処理（任意）
        });
```
    - obj には以下の形式のオブジェクトが渡される
```
        obj: {
        	 inputs: {
        		接続ID0 : { type: "xxx", name: "xxx"},
        		接続ID1 : { type: "xxx", name: "xxx"},
        		   :
        	 },
        	 outputs: {
        		接続ID0 : { type: "xxx", name: "xxx"},
        		接続ID1 : { type: "xxx", name: "xxx"},
        		   :
           }
        }
```
        - inputs
            - 入力ポートの情報
        - outputs
            - 出力ポートの情報
        - 接続ID
            - 各入出力ポートに割り当てられた任意のID
        - type
            - ポートの種類（"midi" "osc" ...など）
        - name
            - ポート名

------------------------------------
### JSONメッセージの受信

#### message_json
    - JSONメッセージを受信
```
		socket.on("message_json", function(obj){
            // JSONメッセージ受信時の処理（任意）
        });
```
    - join_as_wsjson で作成されたJSON出力ポートからの受信
    - obj には以下の形式のオブジェクトが渡される
```
      obj: {
         address: "/foo/bar/", // OSCのaddressに相当する文字列
         args:    []           // OSCのargsに相当する配列
      }
```

==================================================================
## WebApp→Creators' Hubサーバーへのメッセージ

------------------------------------
### 入出力ポート接続状態操作

#### add_connection
    - 入出力ポート間の接続・切断
```
        var param = {
            inputId: 入力ポートの接続ID,
            outputId: 出力ポートの接続ID,
            connect: true または false
        }
        socket.emit("add_connection", param);
```
    - inputId
        - 入力ポートの接続ID（update_listで渡されたinputsのID）
    - outputId
        - 出力ポートの接続ID（update_listで渡されたoutputsのID）
    - connect
        - trueなら接続 ／ falseなら切断

#### cleanup_connection_history
    - 接続情報履歴のクリア
```
        socket.emit("cleanup_connection_history");
```
        - Creators' Hubサーバー側で保存されている過去に使われたポートの接続情報をクリアする
        - 現在の接続状態を変更するものではない

------------------------------------
### Creators' HubサーバーとのJSONメッセージの送受信

#### join_as_wsjson
    - JSON入出力ポート作成
```
		socket.emit("join_as_wsjson", { "name": "好きな名前をつける" } );
```
	- name で指定した名前の入出力ポートが IN と OUT に作成される

#### exit_wsjson
    - JSON入出力ポート削除
```
	    socket.emit("exit_wsjson");
```

#### message_json
    - JSON入力ポートへのメッセージ送信
```
        // ノートオンを送る例
		var obj = {
			address: "/midi/noteon",
			args: [0,60, 127]
		};
		socket.emit("message_json", obj);
```
    - 引数として以下の形式のオブジェクトを渡す
```
      obj: {
         address: "/foo/bar/", // OSCのaddressに相当する文字列
         args:    []           // OSCのargsに相当する配列
      }
```

------------------------------------
### 入出力ポートの作成・削除

#### open_input
    - 入力ポートの作成
```
    	// osc入力の作成例
		socket.emit("open_input", { type: "osc", name: "localhost:12345" });
	   	// 仮想midi入力の作成例
		socket.emit("open_input", { type: "midi", name: "test virtual midi" });
	   	// rtp-midi入力の作成例
		socket.emit("open_input", { type: "rtp", name: "test rtp midi" });
```
    - 引数として以下の形式のオブジェクトを渡す
```
        {
            type: "osc",            // Creators' Hubモジュールのタイプ識別子
            name: "localhost:12345" // 名前
        }
```
    - type
        - 各モジュール毎に決められたタイプ識別子
    - name
        - 入出力ポート名
            - OSCの場合は "ホスト名:ポート"
            - 仮想MIDIの場合は任意の文字列
            - この名前は各モジュール毎に決められたルールに従って設定する

#### open_output
    - 出力ポートの作成
```
    	// osc出力の作成例
		socket.emit("open_output", { type: "osc", name: "localhost:12345" });
	   	// 仮想midi出力の作成例
		socket.emit("open_output", { type: "midi", name: "test virtual midi" });
	   	// rtp-midi出力の作成例
		socket.emit("open_output", { type: "rtp", name: "test rtp midi" });
```
    - 引数はopen_inputと同じ

#### close_input
    - 入力ポートの削除
        - 方法1. 引数としてopen_inputと同じtype, nameを送る
```
    	// osc入力の削除例
		socket.emit("close_input", { type: "osc", name: "localhost:12345" });
```
        - 方法2. 引数として接続IDを送る
```
    	// 接続IDで削除する例
		socket.emit("close_input", { inputId: 入力ポートの接続ID });
```

#### close_output
    - 出力ポートの削除
        - 方法1. 引数としてopen_outputと同じtype, nameを送る
```
    	// osc入力の削除例
		socket.emit("close_output", { type: "osc", name: "localhost:12345" });
```
        - 方法2. 引数として接続IDを送る
```
    	// 接続IDで削除する例
		socket.emit("close_output", { outputId: 出力ポートの接続ID });
