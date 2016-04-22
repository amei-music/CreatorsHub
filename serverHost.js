module.exports = {
  create: ServerHost,
}

var os          = require('os');
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
                
  g_httpApp: undefined,
  g_server: undefined,
  g_io: undefined,

  // モジュール追加
  appendModule : function(name){
    var module = require(name);
    if(module){
      this.modules[module.type] = module;
      module.init(this);
    }else{
      console.log("appendModule: " + name + " not found.");
    }
  },
  
  // 初期化
  init : function(){
    this.openWebSocket();
    
    var settings = this.clients.loadSettings();
    for(var i in settings.oscInputs){
       this.open_input({type: "osc", name: settings.oscInputs[i].name});
    }
    for(var i in settings.oscOutputs){
       this.open_output({type: "osc", name: settings.oscOutputs[i].name});
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
    this.g_io.sockets.emit("update_list", {inputs: inputs, outputs: outputs, connections: this.clients.connectionsById});
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
  open_input : function(obj) {
    // obj.type obj.name
    var input = this.modules[obj.type].createInput(obj.name);
    var inputId = this.clients.addNewClientInput(input);
    this.clients.saveSettings()
    this.update_list(); // クライアントのネットワーク表示更新
  },

  //  - このサーバーの送信ポートを作成する
  open_output : function(obj) {
    // obj.type obj.name
    var output = this.modules[obj.type].createOutput(obj.name);
    var outputId = this.clients.addNewClientOutput(output);
    this.clients.saveSettings()
    this.update_list(); // クライアントのネットワーク表示更新
  },

  //  - このサーバーの受信ポートを削除する
  close_input : function(obj) {
    // inputId または type, name で削除
    var inputId = (obj.inputId !== undefined) ? obj.inputId : this.clients.name2InputClientId(obj.type, obj.name);
    if(this.clients.deleteClientInput(inputId)){
      console.log("close_input:" + inputId);
    }
    this.clients.saveSettings()
    this.update_list(); // クライアントのネットワーク表示更新
  },

  //  - このサーバーの送信ポートを削除する
  close_output : function(obj) {
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
        }
      });
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

    // (2)のためのAPI
    //socket.on("join_as_wsjson",      this.join_as_wsjson.bind(this, socket) ); // wsjsonクライアントとしてネットワークに参加する
    //socket.on("exit_wsjson",         this.exit_wsjson.bind(this, socket) );    // ネットワークから離脱する
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
    socket.on("open_input",  this.open_input.bind(this) );       // 受信ポートを開く
    socket.on("open_output", this.open_output.bind(this) );      // 送信ポートを開く
    socket.on("close_input",  this.close_input.bind(this) );     // 受信ポートを閉じる
    socket.on("close_output", this.close_output.bind(this) );    // 送信ポートを閉じる

    // ソケット自体の接続終了
    socket.on("disconnect",   this.disconnect.bind(this, socket) );
  },
}};
