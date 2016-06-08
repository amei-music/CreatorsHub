このドキュメントにはSPEAKSの各通信プロトコルの実装方法と使用方法をまとめます。

# SPEAKSモジュールとは
SPEAKSの各通信プロトコルの実装をプラグイン化したもの。

# SPEAKSモジュールの作成方法

## SPEAKSモジュールの作成例
何もしないSPEAKSモジュールの例。

``` javascript
    var type = "sample";  // モジュールタイプ識別子（モジュールごとに一意な文字列）
    
    module.exports = {
        type: type, // 識別子
        createInput: ClientIOPort,  // 入力ポートの作成
        createOutput: ClientIOPort, // 出力ポートの作成
        init: function(hostAPI){}   // 初期化関数
    }

    // 
    var client_io   = require('./client_io');
    function ClientIOPort(name, emitter){
        var io = client_io(type, name);
        return io;
    }
```

## SPEAKSモジュールのメソッドとプロパティ

### プロパティ
- type
    - SPEAKSモジュール識別子
    - 他のSPEAKSモジュールと区別するための一意な文字列
        - 'midi' 'json' 'rtp' ... 'hoge' 'foo' 'bar' 

### メソッド
- createInput(name)
    - 入力ポートの作成
    - name
        - 入力ポートの名前
    - client_io オブジェクト

- createOutput(name)
    - 出力ポートの作成
    - name
        - 出力ポートの名前
    - client_io オブジェクト

- init(hostAPI)
    - モジュールがロードされる際に呼ばれる
    - デバイスの初期化などが必要な場合はここで行う
        - → 参考：clientMidi.js
    - hostAPI
        - serverHost側とのやりとりをするAPI
        - 後述

## 入出力ポート（client_io オブジェクト）
createInput, ClientIOPort 時に作成するオブジェクト

### client_io.js
- 入出力ポートの雛形
    - 入出力ポート作成時、このclient_ioを使い、必要なメソッドのみ書き換えて実装を行うことができる
    - 使用例    
``` javascript
        var type = "hoge";
        var client_io   = require('./client_io');
        module.exports = {
            type: "hoge", 
            createInput: function(name){
                var io = client_io(type, name);
                io.listenMessage = function(){
                    // 必要なメソッドのみ書き換えて実装
                };
            },
            createOutput: function(name){
                return client_io(type, name);
            },
            init: function(hostAPI){}
        }
```
    - client_io には以下のプロパティとメソッドがある
    
### client_io のプロパティ
基本的に owner 以外は操作不要。他のプロパティは必要に応じて参照。

- type
    - SPEAKSモジュール識別子が設定される

- name
    - 入出力ポートごとの名前が設定される

- key
    - 入出力ポート識別・検索用キー
        - clientManager内部で使用
        - 接続状態の保存・再接続時などに使用

- id
    - 入出力ポートID
        - clientManager内部で使用
        - 接続状態の設定、メッセージの配信などに使用

- owner
    - 入出力ポートが何によって作成されたか
        - "system"
            - システムによって作成されたポート
            - MIDIなど接続されたデバイスに依存するもの
            - ユーザーは削除できない
        - "user"
            - ユーザーによって（設定画面から）作成されたポート
            - 削除可能
            - OSC, JSONなど
            - createInput, createOutput 時には owner を "user" にする必要がある
            
### client_io のメソッド
各SPEAKSモジュールごとのプロトコル変換処理などをここで実装する。

- listenMessage
    - 入力ポートで使用
    - createInput時に呼ばれる
    - ここで入力ポートの受信に必要な初期化処理を行う
        - → 参考：clientOsc.js

- sendMessage(msg)
    - 出力ポートで使用
    - msg をそのままデバイスに出力

- decodeMessage(msg)
    - モジュールごとのプロトコルから共通プロトコルに変換
    - msg
        - デバイス等から受信したメッセージ
    - 戻り値
        - msgを以下のフォーマット（共通プロトコル）に変換する
``` javascript      
        buf = {
            address: "/foo/bar/", // OSCのaddressに相当する文字列
            args:    []           // OSCのargsに相当する配列
        }
        return buf;
```

- encodeMessage(buf)
    - 共通プロトコルからモジュールごとのプロトコルに変換
    - buf
        - decodeMessage の戻り値と同じ形式の入力
    - 戻り値
        - デバイス等へ出力可能なモジュールごとのプロトコル
        - decodeMessage の入力と同じ形式

-　simplify
    - typeと名前だけのオブジェクトを取得
    - 設定画面側で情報表示に使用
    
## hostAPI
SPEAKSモジュールとserverHostとのやりとりをするAPI。
init(hostAPI) の引数として下記のオブジェクトが渡される。
``` javascript
  hostAPIs4ClientModule : function(){
    return {
      deleteInput : function(type, name){
        this.clients.deleteClientInput(this.clients.name2InputClientId(type, name));
      }.bind(this),
      deleteOutput : function(type, name){
        this.clients.deleteClientOutput(this.clients.name2OutputClientId(type, name));
      }.bind(this),
      addInput : function(input){
        return this.clients.addNewClientInput(input);
      }.bind(this),
      addOutput : function(output){
        return this.clients.addNewClientOutput(output);
      }.bind(this),
      updateList : function(output){
        this.update_list();
      }.bind(this),
      deliverMessage : function(id, obj){
        this.clients.deliver(id, obj);
      }.bind(this),
      sendMessageTo : function(id, msg, obj){
        this.g_io.to(id).emit(msg, obj);                
      }.bind(this),
      sendWebAppMessage : function(msg, obj){
        this.g_io.sockets.emit(msg, obj);                
      }.bind(this),
    };
  },
```
### hostAPI のメソッド

- hostAPI.addInput : function(input)
    - 入力ポートの追加
        - ユーザーが作成するポートではなくデバイスのポートをserverHostに登録するために使用
    - input
        - client_io オブジェクト
    - → 参考：clientMidi.js
    
- hostAPI.addOutput : function(output)
    - 出力ポートの追加
        - ユーザーが作成するポートではなくデバイスのポートをserverHostに登録するために使用
    - output
        - client_io オブジェクト
    - → 参考：clientMidi.js

- hostAPI.deleteInput(type, name)
    - 入力ポートの削除
        - デバイスのポートが削除された場合serverHostから削除するために使用
    - → 参考：clientMidi.js

- hostAPI.deleteOutput(type, name)
    - 出力ポートの削除
        - デバイスのポートが削除された場合serverHostから削除するために使用
    - → 参考：clientMidi.js

- updateList()
    - WebApp側にポートの追加や削除により接続が更新されたことを通知する
        - WebApp側ソケットに "update_list" メッセージが送られる

- deliverMessage(id, obj)
    - 各ポートへのメッセージ配信
        - 入力ポートが受信したメッセージをserverHostに送り、接続された出力先ポートへ配信するために使用
    - id
        - 自身の入出力ポートID（client_io.id）
    - obj
        - デバイス等から受信したメッセージ
        - このメッセージは serverHost 側で client_io.decodeMessage によってデコードされ、出力先ポートの encodeMessage によりプロトコル変換が行わわれ送信される。
    - → 参考：clientMidi.js など
    
-　sendMessageTo(id, msg, obj)
    - WebSocket接続されたポートへのメッセージ出力
        - WebSocket接続の出力ポートの場合のみ、出力先は serverHost 側が持っているため、このAPI経由で出力を行う
    - id
        - 出力先ポートID(=自身の入出力ポートID)
    - msg
        - socket.emit のイベント名
    - obj
        - socket.emit のデータ
    - 使用例
        - → 参考：clientJson.js
``` javascript
            var io = client_io(module.exports.type, name);
                :
            io.sendMessage = function(msg){
                host.sendMessageTo(this.socketId, "message_json", msg);
            };
```

-　sendWebAppMessage(msg, obj)
    - WebSocket接続されたWebApp側へのメッセージ出力
        - sendMessageTo の出力先がWebApp側になったもの
        - 独自のイベントを定義してWebApp側で使いたい場合に使用
    - 使用例
        - → 参考：clientAnalyzer.js
        - → 参考：mw1.js

# SPEAKSモジュールの使用方法
SPEAKSサーバーの起動とSPEAKSモジュールの登録は以下のように行います。

1. SPEAKSサーバーの作成
``` javascript
    var serverHost = require('./serverHost');
    var g_server   = serverHost.create();
```

2. SPEAKSモジュールの登録
``` javascript
    g_server.appendModule('./client_modules/clientJson');
    g_server.appendModule('./client_modules/clientOsc');
    g_server.appendModule('./client_modules/clientMidi');
    g_server.appendModule('./client_modules/clientRtpMidi');
    g_server.appendModule('./client_modules/clientAnalyzer');
```

3. SPEAKSサーバーの起動
``` javascript
    g_server.init();
```

- 使用例
    - → 参考：server.js
 