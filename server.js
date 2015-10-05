var http        = require('http');
var connect     = require('connect');
var serveStatic = require('serve-static');
var socketio    = require("socket.io")
var dgram       = require("dgram");
var osc         = require('osc-min');

var convert     = require('./convert')
var mididevs    = require('./mididevices') // require('midi');

var LISTEN_PORT = 16080;
var PUBLIC_DIR  = __dirname + "/public"

//==============================================================================
// 全体の管理情報
//==============================================================================
function ClientJson(/*direction,*/ socketId){
  return {
    type:      "json",
    socketId:  socketId,

    deliver: function(msg, msg_from){
      g_io.to(this.socketId).emit("message_json", convert.convertMessage(msg, msg_from, "json"));
    },

    simplify: function(){ return {type: "json", socketId: this.socketId} },
  };
}

function ClientOsc(/*direction,*/ host, port){
  return {
    type:      "osc",
    host:      host, // 受信時には使わない
    port:      port,

    deliver: function(msg, msg_from){
      var buf = convert.convertMessage(msg, msg_from, "osc")
      // console.log("*********")
      // console.log(msg)
      // console.log(this.port, this.host)
      g_oscSender.send(buf, 0, buf.length, this.port, this.host);
    },

    simplify: function(){ return {type: "osc", host: this.host, port: this.port} },
  }
}

function ClientMidi(/*direction,*/ name){
  return {
    type:      "midi",
    name:      name,


    deliver: function(msg, msg_from){
      var buf = convert.convertMessage(msg, msg_from, "midi")
      console.log("midi out ", "[" + buf.join(", ") + "]")
      g_midiDevs.outputs[this.name].sendMessage(buf);
    },

    simplify: function(){ return {type: "midi", name: this.name} },
  };
}

//==============================================================================
// プロトコルに依存しないクライアント一覧, コネクション設定に関する部分
//==============================================================================
function Clients(){ return {
  inputs:      {},
  outputs:     {},
  connections: {}, // {input_clientId: {output_clientId: true, ...}, ...}
  id_input:    0, // 接続のユニークID
  id_output:   0, // 接続のユニークID

  //==============================================================================
  // クライアント管理
  //==============================================================================
  addNewClientInput: function(client){
    this.inputs[this.id_input] = client;
    this.id_input += 1;
    return this.id_input - 1;
  },

  addNewClientOutput: function(client){
    this.outputs[this.id_output] = client;
    this.id_output += 1;
    return this.id_output - 1;
  },

  deleteClientInput: function(clientId){
    var existed = (clientId in this.inputs);
    delete this.inputs[clientId];

    for(var outputId in this.connections[clientId]){
      this.deleteConnection(clientId, outputId);
    }

    // console.log(this.connections)
    return existed;
  },

  deleteClientOutput: function(clientId){
    var existed = (clientId in this.outputs);
    delete this.outputs[clientId];

    for(var inputId in this.connections){
      for(var outputId in this.connections[inputId]){
        if(outputId == clientId) this.deleteConnection(inputId, outputId);
      }
    }

    // console.log(this.connections)
    return existed;
  },

  //==============================================================================
  // コネクション管理
  //==============================================================================

  addConnection: function(input_clientId, output_clientId){
    // 結線情報を作る
    if (! this.connections[input_clientId]){
      this.connections[input_clientId] = {};
    }
    this.connections[input_clientId][output_clientId] = true;
  },

  deleteConnection: function(input_clientId, output_clientId){
    // 結線情報を切る
    if (this.connections[input_clientId]){
      delete this.connections[input_clientId][output_clientId];
    } else {
      // 何もしない
    }

  },

  //==============================================================================
  // データ送信管理
  //==============================================================================
  // inputに届いたメッセージをコネクション先に配信
  deliver: function(input_clientId, data){
    for(var outputId in this.connections[input_clientId]){
      var output = this.outputs[outputId];
      output.deliver(data, this.inputs[input_clientId].type); // いわゆるダブルディスパッチ
    }
  },

  // socketのcallbackで届いてきたメッセージの送信元を調べる
  socketId2ClientId : function(socketId, inputsOutputs){
    for (var k in inputsOutputs) {
      var client = inputsOutputs[k];
      if(client.type == "json" && client.socketId == socketId){
        return k;
      }
    }
    return -1;
  },
  socketId2InputClientId  : function(socketId){ return this.socketId2ClientId(socketId, this.inputs ); },
  socketId2OutputClientId : function(socketId){ return this.socketId2ClientId(socketId, this.outputs); },

  midiName2ClientId : function(name, inputsOutputs){
    for (var k in inputsOutputs) {
      var client = inputsOutputs[k];
      if(client.type == "midi" && client.name == name){
        return k;
      }
    }
    return -1;
  },
  midiName2InputClientId  : function(name){ return this.midiName2ClientId(name, this.inputs ); },
  midiName2OutputClientId : function(name){ return this.midiName2ClientId(name, this.outputs); },

}}


//==============================================================================
// アプリ本体 (WebSocketの通信定義を作ったりMIDI/OSCの送受信を張ったり)
//==============================================================================
function App(){ return{
  clients : Clients(),
  oscsocks: {}, // {input_oscport: {clientId: , sock: }} osc送受信オブジェクトを詰めておくところ
                // socket一覧はio.socketsにある

  // ネットワーク接続者一覧を表示する(socketだからサーバー側からpush可能)
  update_list : function(){
    // メソッド類は削ぎ落として表示に必要な情報だけまとめる
    var inputs  = {}; for (var i in this.clients.inputs ) inputs [i] = this.clients.inputs [i].simplify();
    var outputs = {}; for (var o in this.clients.outputs) outputs[o] = this.clients.outputs[o].simplify();

    // broadcast all clients (including the sender)
    g_io.sockets.emit("update_list", {inputs: inputs, outputs: outputs, connections: this.clients.connections});
  },

  // ネットワークのノード間の接続/切断をする
  add_connection : function(obj){
    var inputId = obj.inputId, outputId = obj.outputId, connect = obj.connect

    if (connect == true){
      this.clients.addConnection(inputId, outputId) // 接続
      console.log("input '" + inputId + "' connected to output '" + outputId + "'");
    } else {
      this.clients.deleteConnection(inputId, outputId) // 切断
      console.log("input '" + inputId + "' and output '" + outputId + "' disconnected");
    }

    this.update_list(); // ネットワーク更新
  },

  // wsjsonクライアントとしてネットワークに参加する
  join_as_wsjson : function(socket) {
    var changed = false;
    if (this.clients.socketId2InputClientId(socket.id) < 0){
      var inputId  = this.clients.addNewClientInput (ClientJson(socket.id));
      console.log("[Web Socket #'" + socket.id + "'] joined as JSON input client [id=" + inputId + "]");
      changed = true;
    }
    if (this.clients.socketId2OutputClientId(socket.id) < 0){
      var outputId = this.clients.addNewClientOutput(ClientJson(socket.id));
      console.log("[Web Socket #'" + socket.id + "'] joined as JSON output client [id=" + outputId + "]");
      changed = true;
    }

    if(changed) this.update_list(); // ネットワーク更新
  },

  // ネットワークから離脱する
  exit_wsjson : function(socket) {
    var existed = false;
    existed |= this.clients.deleteClientInput (this.clients.socketId2InputClientId (socket.id));
    existed |= this.clients.deleteClientOutput(this.clients.socketId2OutputClientId(socket.id));

    if(existed){
      console.log("[Web Socket #'" + socket.id + "'] exited.");
    }

    this.update_list(); // ネットワーク更新
  },

  // JSONメッセージを受信する
  message_json : function(socket, obj){
    var inputId  = this.clients.socketId2InputClientId(socket.id);

    if (inputId >= 0) { // joinしたクライアントだけがメッセージのやり取りに参加できる
      console.log("message from input #" + inputId);

      this.clients.deliver(inputId, obj); // 配信
    }
  },

  //  - 指定のアドレス/ポート番号をoscクライアントとしてネットワークに追加する
  join_as_osc : function(obj) {
    var inPort = 12345; // 受信ポートは指定が無ければサーバーが独自に決める

    // 入り口と出口のudpポートを作成する
    var _onRead = function(inputId){
      return function(msg, rinfo) {
        console.log("message from input #" + inputId);

        this.clients.deliver(inputId, msg); // 配信
      }
    }

    // socketのlistenに成功してからネットワークに登録したいので、idは先回りで受け取る
    this.oscsocks[inPort] = dgram.createSocket("udp4", _onRead(this.clients.id_input));
    this.oscsocks[inPort].bind(inPort);

    // 接続ネットワークに参加する
    var inputId  = this.clients.addNewClientInput (ClientOsc(obj.host, inPort));
    var outputId = this.clients.addNewClientOutput(ClientOsc(obj.host, obj.port));

    console.log("[OSC #'" + obj.host + "'] joined as OSC client [id=" + inputId + "]");

    this.update_list(); // クライアントのネットワーク表示更新
  },

  // websocketとしての応答内容を記述
  onWebSocket : function(socket){
    this.update_list(); // websocket接続時に一度現状を送る

    // (1) ただweb設定画面を見に来た人と、
    // (2) WebSocket-JSON (以下wsjson) でネットワークに参加しにきた人と、
    // (3) OSCでネットワークに参加しにきた人は別扱いする必要がある

    // (1)のためのAPI
    socket.on("add_connection", this.add_connection.bind(this) );

    // (2)のためのAPI
    socket.on("join_as_wsjson", this.join_as_wsjson.bind(this, socket) ); // wsjsonクライアントとしてネットワークに参加する
    socket.on("exit_wsjson",    this.exit_wsjson.bind(this, socket) );    // ネットワークから離脱する
    socket.on("message_json",   this.message_json.bind(this, socket) );   // JSONメッセージを受信する

    // (3)のためのAPI
    socket.on("join_as_osc",    this.join_as_osc.bind(this) );              // 指定のアドレス/ポート番号をoscクライアントとしてネットワークに追加する
    socket.on("exit_osc",       function(){ console.log("unimplemented")}); // 指定のアドレス/ポート番号をoscクライアントとしてネットワークから除外する
    // oscアプリ本体とこのserver.jsのoscモジュールが直接メッセージをやり取りするので、
    // oscクライアントとの実通信にWebSocketは絡まない。あくまでコネクション管理のみ

    // ソケット自体の接続終了
    socket.on("disconnect",     this.exit_wsjson.bind(this, socket) );
  },

  // 新規MIDI入力デバイスの登録
  onAddNewMidiInput : function(midiIn, name){
    // ネットワークに登録
    console.log("MIDI Input [" + name + "] connected.");
    var inputId  = this.clients.addNewClientInput (ClientMidi(name));
    this.update_list(); // クライアントのネットワーク表示更新

    // コールバックを作る(影でinputIdをキャプチャする)
    return (function(deltaTime, message) {
      // The message is an array of numbers corresponding to the MIDI bytes:
      //   [status, data1, data2]
      // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
      // information interpreting the messages.
      var msg = {'msg': message, 'delta': deltaTime};

      if (message.length != 1 || message[0] != 0xF8) console.log(msg); // log

      this.clients.deliver(inputId, message); // 配信
    }).bind(this);
  },

  // MIDI入力デバイスの切断通知
  onDeleteMidiInput : function(midiIn, name){
    console.log("MIDI Input [" + name + "] disconnected.");
    this.clients.deleteClientInput(this.clients.midiName2InputClientId(name));
    this.update_list(); // クライアントのネットワーク表示更新
  },

  // 新規MIDI出力デバイスの登録
  onAddNewMidiOutput : function(midiOut, name){
    // ネットワークに登録
    console.log("MIDI Output [" + name + "] connected.");
    this.clients.addNewClientOutput(ClientMidi(name));
    this.update_list(); // クライアントのネットワーク表示更新
  },

  // MIDI出力デバイスの切断通知
  onDeleteMidiOutput : function(midiOut, name){
    console.log("MIDI Output [" + name + "] disconnected.");
    this.clients.deleteClientOutput(this.clients.midiName2OutputClientId(name));
    this.update_list(); // クライアントのネットワーク表示更新
  }

}}

//==============================================================================
// start!
//==============================================================================
var g_app       = App();
var g_oscSender = dgram.createSocket("udp4")
var g_midiDevs  = mididevs.MidiDevices(
  g_app.onAddNewMidiInput.bind(g_app),
  g_app.onDeleteMidiInput.bind(g_app),
  g_app.onAddNewMidiOutput.bind(g_app),
  g_app.onDeleteMidiOutput.bind(g_app)
);

// PUBLIC_DIR以下を普通のhttpサーバーとしてlisten
var g_httpApp = connect();
g_httpApp.use(serveStatic(PUBLIC_DIR));
var g_server = http.createServer(g_httpApp);
g_server.listen(LISTEN_PORT);

// websocketとしてlistenして、応答内容を記述
var g_io = socketio.listen(g_server);
g_io.sockets.on("connection", g_app.onWebSocket.bind(g_app));

console.log("================================================");
console.log("listening web socket on port " + LISTEN_PORT);
console.log("connection control at http://localhost:" + LISTEN_PORT + "/");
console.log("================================================");

//==============================================================================
// graceful shutdown
//==============================================================================

function graceful_shutdown(){
  process.exit();
}

// 例外
process.on('uncaughtException', function(err) {
    console.log(err.stack);
    graceful_shutdown();
});

// windowsのctrl-c
if (process.platform === "win32") {
  var rl = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on("SIGINT", function () {
    console.log("Caught interrupt signal");
    graceful_shutdown();
  });
}

// それ以外のctrl-c
process.on("SIGINT", function () {
  //graceful shutdown
  console.log("Caught interrupt signal");
  graceful_shutdown();
});
