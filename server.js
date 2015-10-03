var http        = require('http');
var connect     = require('connect');
var serveStatic = require('serve-static');
var socketio    = require("socket.io")
var midi        = require('midi');
var dgram       = require("dgram");
var osc         = require('osc-min');

var convert     = require('./convert')

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
      console.log("*********")
      console.log(buf)
      console.log(buf.length)
      console.log(this.port, this.host)
      g_oscSender.send(buf, 0, buf.length, this.port, this.host);
    },

    simplify: function(){ return {type: "osc", host: this.host, port: this.port} },
  }
}

function ClientMidi(/*direction,*/ portNum, name){
  return {
    type:      "midi",
    portNum:   portNum,
    name:      name,


    deliver: function(msg, msg_from){
      var buf = convert.convertMessage(msg, msg_from, "midi")
      console.log("midi out ", msg.address, " => ", buf)
      g_midiObj.outputs[this.portNum].sendMessage(buf);
    },

    simplify: function(){ return {type: "midi", portNum: this.portNum, name: this.name} },
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
  deliver: function(input_clientId, functor){
    for(var outputId in this.connections[input_clientId]){
      var output   = this.outputs[outputId];
      functor(output);
    }
  },

  // socketのcallbackで届いてきたメッセージの送信元を調べる
  socketId2clientId: function(socketId, inputsOutputs){
    for (var k in inputsOutputs) {
      var client = inputsOutputs[k];
      if(client.type == "json" && client.socketId == socketId){
        return k;
      }
    }
    return -1;
  },

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
    var inputId  = this.clients.addNewClientInput (ClientJson(socket.id));
    var outputId = this.clients.addNewClientOutput(ClientJson(socket.id));

    console.log("[Web Socket #'" + socket.id + "'] joined as JSON client [id=" + inputId + "]");

    this.update_list(); // ネットワーク更新
  },

  // ネットワークから離脱する
  exit_wsjson : function(socket) {
    var existed = false;
    existed |= this.clients.deleteClientInput (this.clients.socketId2clientId(socket.id, this.clients.inputs ));
    existed |= this.clients.deleteClientOutput(this.clients.socketId2clientId(socket.id, this.clients.outputs));

    if(existed){
      console.log("[Web Socket #'" + socket.id + "'] exited.");
    }

    this.update_list(); // ネットワーク更新
  },

  // JSONメッセージを受信する
  message_json : function(socket, obj){
    var inputId  = this.clients.socketId2clientId(socket.id, this.clients.inputs);

    if (inputId >= 0) { // joinしたクライアントだけがメッセージのやり取りに参加できる
      console.log("message from input #" + inputId);

      this.clients.deliver(inputId, function(output){output.deliver(obj, "json");} ); // 配信
    }
  },

  //  - 指定のアドレス/ポート番号をoscクライアントとしてネットワークに追加する
  join_as_osc : function(obj) {
    var inPort = 12345; // 受信ポートは指定が無ければサーバーが独自に決める

    // 入り口と出口のudpポートを作成する
    var _onRead = function(inputId){
      return function(msg, rinfo) {
        console.log("message from input #" + inputId);

        this.clients.deliver(inputId, function(output){output.deliver(msg, "osc");} ); // 配信
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
  newMidiInput : function(portId, name){
    // ネットワークに登録
    console.log("input  ", portId, name);
    var inputId  = this.clients.addNewClientInput (ClientMidi(portId, name));

    // コールバックを作る(影でinputIdをキャプチャする)
    return function(deltaTime, message) {
      // The message is an array of numbers corresponding to the MIDI bytes:
      //   [status, data1, data2]
      // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
      // information interpreting the messages.
      var msg = {'msg': message, 'delta': deltaTime};
      console.log(msg);

      this.clients.deliver(inputId, function(output){output.deliver(message, "midi");} ); // 配信
    };
  },

  // 新規MIDI出力デバイスの登録
  newMidiOutput : function(portId, name){
    // ネットワークに登録
    console.log("output ", portId, name);
    var outputId = this.clients.addNewClientOutput(ClientMidi(portId, name));
  },
}}

//==============================================================================
// MIDIリストを管理してくれる人
//==============================================================================
function MidiObj(){ return {
  input:  new midi.input(),  // port一覧を出すためのglobalな(openPortしない)inputを一つ用意しておく
  output: new midi.output(), // port一覧を出すためのglobalな(openPortしない)outputを一つ用意しておく

  inputs : {}, // 開いたportにつながっているmidiオブジェクト
  outputs: {}, // 開いたportにつながっているmidiオブジェクト

  setup_midiports: function(onNewInput, onNewOutput){
    for(var portId=0; portId<this.input.getPortCount(); ++portId){
      // inputを見つけたときの処理を実行し、そのinput MIDI portからの受信時にしたい処理をもらう
      var callback = onNewInput(portId, this.input.getPortName(portId));
      // 実際に開いておく
      this.inputs[portId] = new midi.input();
      this.inputs[portId].on('message', callback);
      this.inputs[portId].openPort(portId);
      // (Sysex, Timing, Active Sensing) のignoreを設定する
      this.inputs[portId].ignoreTypes(false, false, true);
    }

    for(var portId=0; portId<this.output.getPortCount(); ++portId){
      // outputを見つけたときの処理を実行する
      onNewOutput(portId, this.output.getPortName(portId));
      // 実際に開いておく
      this.outputs[portId] = new midi.output();
      this.outputs[portId].openPort(portId);
    }
  },
}}


//==============================================================================
// start!
//==============================================================================
var g_app       = App();
var g_midiObj   = MidiObj();
var g_oscSender = dgram.createSocket("udp4")

// midiのコネクションを作成
g_midiObj.setup_midiports(g_app.newMidiInput.bind(g_app), g_app.newMidiOutput.bind(g_app));

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
