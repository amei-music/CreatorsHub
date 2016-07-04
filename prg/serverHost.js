module.exports = {
  create: ServerHost,
}

var os          = require('os');
var fs          = require("fs");
var http        = require('http');
var connect     = require('connect');
var serveStatic = require('serve-static');
var socketio    = require("socket.io");

var clientManager =  require('./clientManager');

var LISTEN_PORT      = 16080;
var PUBLIC_DIR       = __dirname + "/public";

//==============================================================================
// アプリ本体 (WebSocketの通信定義を作ったりMIDI/OSCの送受信を張ったり)
//==============================================================================
function ServerHost(){ return{
  clients : clientManager.create(),//Clients(),
  oscsocks: {}, // {input_oscport: {clientId: , sock: }} osc送受信オブジェクトを詰めておくところ
                // socket一覧はio.socketsにある
  modules: {},  // クライアントモジュール
  serverAddress: undefined,
                
  g_httpApp: undefined,
  g_server: undefined,
  g_io: undefined,

  // モジュール追加
  appendModule : function(name){
    var module = require(name);
    if(module){
      if(!module.type){
        console.log("appendModule: " + name + " - 'type' not defined.");
      }else if(!module.createInput){
        console.log("appendModule: " + name + " - 'createInput' not defined.");
      }else if(!module.createOutput){
        console.log("appendModule: " + name + " - 'createOutput' not defined.");
      }else if(!module.init){
        console.log("appendModule: " + name + " - 'init' not defined.");
      }else{
        this.modules[module.type] = module;
        module.init(this.hostAPIs4ClientModule());
      }
    }else{
      console.log("appendModule: " + name + " not found.");
    }
  },
  
  appendModulesInDir : function(dir){
    // search files in dir.
    fs.readdir(dir, function (err, files) {
      if(err){
        console.log(err);
      }else{
        for(var i in files){
          filepath = dir + files[i];
          // if the file is directory, append it as Creators'Hub module.
          if(fs.existsSync(filepath) && fs.statSync(filepath).isDirectory()){
            this.appendModule(filepath);
          }
        }
      }
    }.bind(this));
  },
        
  // クライアントモジュール用API
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
  
  // 初期化
  init : function(){
    this.openWebSocket();
    
    var settings = this.clients.loadSettings();
    for(var i in settings.userInputs){
       this.open_input({}, {type: settings.userInputs[i].type, name: settings.userInputs[i].name});
    }
    for(var i in settings.userOutputs){
       this.open_output({}, {type: settings.userOutputs[i].type, name: settings.userOutputs[i].name});
    }

    this.clients.connections = settings.connections;
    this.clients.updateConnectionsById();
    this.update_list(); // ネットワーク更新
    
    //this.openDevices();
  },

  // ネットワーク接続者一覧を表示する(socketだからサーバー側からpush可能)
  update_list : function(){
    // メソッド類は削ぎ落として表示に必要な情報だけまとめる
    var inputs  = {}; for (var i in this.clients.inputs ) inputs [i] = this.clients.inputs [i].simplify();
    var outputs = {}; for (var o in this.clients.outputs) outputs[o] = this.clients.outputs[o].simplify();
    // broadcast all clients (including the sender)
    var msg = {
      server: this.serverAddress,
      port: LISTEN_PORT,
      inputs: inputs,
      outputs: outputs,
      connections: this.clients.connectionsById
    };
    this.g_io.sockets.emit("update_list", msg);
  },

  // ネットワークのノード間の接続/切断をする
  add_connection : function(obj){
    var inputId = obj.inputId, outputId = obj.outputId, connect = obj.connect
    var inputExisted = inputId in this.clients.inputs;
    var outputExisted = outputId in this.clients.outputs;
    if(inputExisted && outputExisted){
      var inputKey = this.clients.inputs[inputId].key;
      var outputKey = this.clients.outputs[outputId].key;

      if (connect == true){
        this.clients.addConnection(inputKey, outputKey) // 接続
        console.log("input '" + inputKey + "' connected to output '" + outputKey + "'");
      } else {
        this.clients.deleteConnection(inputKey, outputKey) // 切断
        console.log("input '" + inputKey + "' and output '" + outputKey + "' disconnected");
      }

      this.clients.saveSettings();
      this.update_list(); // ネットワーク更新
    }
  },

  // 現在使われていないノード間の結線情報を削除する
  cleanup_connection_history : function(){
    this.clients.cleanupConnectionHistory();
    this.clients.saveSettings();
    this.update_list();
  },

  // JSONメッセージを受信してモジュールのcreate,decoder,encoderをテスト
  test_modules : function(obj){
    var result = "";
    result += "INPUT: " + JSON.stringify(obj) + "\n";
    for(var type in this.modules){
    	var ok = false;
      try{
        var input = this.modules[type].createInput("test_input");
        var input_simplified = input.simplify();
        //result += type + " input: " + JSON.stringify(input_simplified) + "\n";
        try{
          var output = this.modules[type].createOutput("test_output");
          var output_simplified = input.simplify();
          //result += type + " output: " + JSON.stringify(output_simplified) + "\n";
          try{
            var encodedObj = output.encodeMessage(obj);
            //result += type + " encoded: " + JSON.stringify(encodedObj) + "\n";
            try{
              var decodedObj = input.decodeMessage(encodedObj);
              //result += type + " decoded: " + JSON.stringify(decodedObj) + "\n";
              if(obj.address != decodedObj.address){
                result += type + " address: WARNING " + obj.address + " != " + decodedObj.address + "\n";
              }else{
                ok = true;
                for(var i in obj.args){
                  if(obj.args[i] != decodedObj.args[i]){
                    ok = false;
                    result += type + " args[" + i + "]: WARNING " + obj.args[i] + " != " + decodedObj.args[i] + "\n";
                  }
                }
              }
            }catch (e){
              result += type + " input.decodeMessage: FATAL ERROR\n";
            }
          }catch (e){
            result += type + " output.encodeMessage: FATAL ERROR\n";
          }
        }catch (e){
          result += type + " createOutput: WARNING - can't create output\n";
        }
      }catch (e){
        result += type + " createInput: WARNING - can't create input\n";
      }
      if(ok){
        result += type + ": OK\n";
      }
    }
    //console.log(result);
    this.g_io.sockets.emit("test_modules", result);
    return result;
  },
  
  // wsjsonクライアントとしてネットワークに参加する
  join_as_wsjson : function(socket, param) {
    var obj = {
      name: param ? param.name : socket.id,
      type: "json",
    };
    this.open_input(socket, obj, "wsjson");
    this.open_output(socket, obj, "wsjson");
  },

  // ネットワークから離脱する
  exit_wsjson : function(socket) {
    var inputExisted = this.clients.deleteClientInput (this.clients.socketId2InputClientId (socket.id));
    var outputExisted = this.clients.deleteClientOutput(this.clients.socketId2OutputClientId(socket.id));
    if(inputExisted || outputExisted){
      console.log("[Web Socket #'" + socket.id + "'] exited.");
    }
    this.update_list(); // ネットワーク更新
  },

  // JSONメッセージを受信する
  message_json : function(socket, obj){
    var inputId  = this.clients.socketId2InputClientId(socket.id);

    if (inputId >= 0) { // joinしたクライアントだけがメッセージのやり取りに参加できる
      // console.log("message from input #" + inputId);

      this.clients.deliver(inputId, obj); // 配信
    }
  },

  //------------------
  // 

  //  - このサーバーの受信ポートを作成する
  open_input : function(socket, obj, owner) {
    // obj.type obj.name
    var input = this.modules[obj.type].createInput(obj.name);
    if(input){
      if(owner){
        input.owner = owner;
      }
      if(socket && socket.id){
        input.socketId = socket.id;
      }
      var inputId = this.clients.addNewClientInput(input);
      this.clients.saveSettings()
      this.update_list(); // クライアントのネットワーク表示更新
    }else{
      console.log("open_input: ERROR - can't create " + obj.type + ":" + obj.name);
    }
  },

  //  - このサーバーの送信ポートを作成する
  open_output : function(socket, obj, owner) {
    // obj.type obj.name
    var output = this.modules[obj.type].createOutput(obj.name);
    if(output){
      if(owner){
        output.owner = owner;
      }
      if(socket && socket.id){
        output.socketId = socket.id;
      }
      var outputId = this.clients.addNewClientOutput(output);
      this.clients.saveSettings()
      this.update_list(); // クライアントのネットワーク表示更新
    }else{
      console.log("open_output: ERROR - can't create " + obj.type + ":" + obj.name);
    }
  },

  //  - このサーバーの受信ポートを削除する
  close_input : function(socket, obj) {
    // inputId または type, name で削除
    var inputId = (obj.inputId !== undefined) ? obj.inputId : this.clients.name2InputClientId(obj.type, obj.name);
    if(this.clients.deleteClientInput(inputId)){
      console.log("close_input:" + inputId);
    }
    this.clients.saveSettings()
    this.update_list(); // クライアントのネットワーク表示更新
  },

  //  - このサーバーの送信ポートを削除する
  close_output : function(socket, obj) {
    // outputId または type, name で削除
    var outputId = (obj.outputId !== undefined) ? obj.outputId : this.clients.name2OutputClientId(obj.type, obj.name);
    if(this.clients.deleteClientOutput (outputId)){
      console.log("close_output:" + outputId);
    }
    this.clients.saveSettings()
    this.update_list(); // クライアントのネットワーク表示更新
  },

  // ネットワークから離脱する
  disconnect : function(socket) {
    var inputExisted = this.clients.deleteClientInput (this.clients.socketId2InputClientId (socket.id));
    var outputExisted = this.clients.deleteClientOutput(this.clients.socketId2OutputClientId(socket.id));

    if(inputExisted || outputExisted){
      console.log("[Web Socket #'" + socket.id + "'] exited.");
    }

    this.clients.saveSettings()
    this.update_list(); // ネットワーク更新
  },

  //------------------
  
  openWebSocket : function(){
    this.g_httpApp= connect();
    this.g_httpApp.use(serveStatic(PUBLIC_DIR));

    this.g_server = http.createServer(this.g_httpApp);
    this.g_server.listen(LISTEN_PORT);

    // websocketとしてlistenして、応答内容を記述
    this.g_io = socketio.listen(this.g_server);
    this.g_io.sockets.on("connection", this.onWebSocket.bind(this));

    console.log("================================================");
    console.log("listening web socket on port " + LISTEN_PORT);
    var interfaces = os.networkInterfaces()
    for (var dev in interfaces) {
      interfaces[dev].forEach(function(iface){
        if ((! iface.internal) && iface.family === "IPv4"){
          console.log("connection control at http://" + iface.address + ":" + LISTEN_PORT + "/");
          this.serverAddress = iface.address;
        }
      }.bind(this));
    }
    console.log("================================================");
  },

  // websocketとしての応答内容を記述
  onWebSocket : function(socket){
    this.update_list(); // websocket接続時に一度現状を送る

    // (1) ただweb設定画面を見に来た人と、
    // (2) WebSocket-JSON (以下wsjson) でネットワークに参加しにきた人と、
    // (3) OSCでネットワークに参加しにきた人は別扱いする必要がある

    // (1)のためのAPI
    socket.on("add_connection",      this.add_connection.bind(this) );
    socket.on("cleanup_connection_history", this.cleanup_connection_history.bind(this) );
    // テスト用API
    socket.on("test_modules",         this.test_modules.bind(this) );   // JSONメッセージを受信してモジュールのdecoder,encoderをテスト

    // (2)のためのAPI
    socket.on("join_as_wsjson",      this.join_as_wsjson.bind(this, socket) ); // wsjsonクライアントとしてネットワークに参加する
    socket.on("exit_wsjson",         this.exit_wsjson.bind(this, socket) );    // ネットワークから離脱する
    socket.on("message_json",        this.message_json.bind(this, socket) );   // JSONメッセージを受信する

    // (3)のためのAPI
    /*
    socket.on("open_new_osc_input",  this.open_new_osc_input.bind(this) );       // OSC受信ポートを増やす
    socket.on("open_new_osc_output", this.open_new_osc_output.bind(this) );      // OSC送信先を登録する
    socket.on("close_osc_input",     this.close_osc_input.bind(this) );          // 開いた受信ポートを閉じる
    socket.on("close_osc_output",    this.close_osc_output.bind(this) );         // OSC送信先を閉じる
    */
    // oscアプリ本体とこのserver.jsのoscモジュールが直接メッセージをやり取りするので、
    // oscクライアントとの実通信にWebSocketは絡まない。あくまでコネクション管理のみ

    // (2),(3)の汎用化
    socket.on("open_input",  this.open_input.bind(this, socket) );       // 受信ポートを開く
    socket.on("open_output", this.open_output.bind(this, socket) );      // 送信ポートを開く
    socket.on("close_input",  this.close_input.bind(this, socket) );     // 受信ポートを閉じる
    socket.on("close_output", this.close_output.bind(this, socket) );    // 送信ポートを閉じる

    // ソケット自体の接続終了
    socket.on("disconnect",   this.disconnect.bind(this, socket) );
  },
}};
