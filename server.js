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

oscSender = dgram.createSocket("udp4")

//==============================================================================
// 全体の管理情報
//==============================================================================
function ClientJson(/*direction,*/ socketId){
  return {
    type:      "json",
    socketId:  socketId,

    deliver: function(msg, msg_from){
      io.to(this.socketId).emit("message_json", convert.convertMessage(msg, msg_from, "json"));
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
      oscSender.send(buf, 0, buf.length, this.port, this.host);
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
      midiObj.outputs[this.portNum].sendMessage(buf);
    },

    simplify: function(){ return {type: "midi", portNum: this.portNum, name: this.name} },
  };
}

//==============================================================================
// データ全体
//==============================================================================
var self = {
  clients_input:  {},
  clients_output: {},
  id_input:      0,
  id_output:     0, // 接続のユニークID

  //==============================================================================
  // クライアント管理
  //==============================================================================
  addNewClientInput: function(client){
    this.clients_input[this.id_input] = client;
    this.id_input += 1;
    return this.id_input - 1;
  },

  addNewClientOutput: function(client){
    this.clients_output[this.id_output] = client;
    this.id_output += 1;
    return this.id_output - 1;
  },

  deleteClientInput: function(clientId){
    var existed = (clientId in this.clients_input);
    delete this.clients_input[clientId];

    for(var outputId in this.connections[clientId]){
      this.deleteConnection(clientId, outputId);
    }

    // console.log(this.connections)
    return existed;
  },

  deleteClientOutput: function(clientId){
    var existed = (clientId in this.clients_output);
    delete this.clients_output[clientId];

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
  connections: {}, // {input_clientId: {output_clientId: true, ...}, ...}
  oscsocks:    {}, // {input_oscport: {clientId: , sock: }} osc送受信オブジェクトを詰めておくところ
  // socketはio.socketsで参照可能

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
    for(var outputId in self.connections[input_clientId]){
      var output   = self.clients_output[outputId];
      functor(output);
    }
  },

  // socketのcallbackで届いてきたメッセージの送信元を調べる
  socketId2clientId: function(socketId, clients){
    for (var k in clients) {
      var client = clients[k];
      if(client.type == "json" && client.socketId == socketId){
        return k;
      }
    }
    return -1;
  },

}


//==============================================================================
// WebSocketの設定
//==============================================================================

// (1) ただweb設定画面を見に来た人と、
// (2) WebSocket-JSON (以下wsjson) でネットワークに参加しにきた人と、
// (3) OSCでネットワークに参加しにきた人は別扱いする必要がある

// (1)のためのAPI
//  - ネットワーク接続者一覧を表示する(socketだからサーバー側からpush可能)
function update_list(){
  // メソッド類は削ぎ落として表示に必要な情報だけまとめる
  var inputs  = {}; for (var i in self.clients_input ) inputs [i] = self.clients_input [i].simplify();
  var outputs = {}; for (var o in self.clients_output) outputs[o] = self.clients_output[o].simplify();

  // broadcast all clients (including the sender)
  io.sockets.emit("update_list", {inputs: inputs, outputs: outputs, connections: self.connections});
}

// (2)のためのAPIは、(1)に加えて
//  - wsjsonクライアントとしてネットワークに参加する
function join_as_wsjson(socket) {
  var inputId  = self.addNewClientInput (ClientJson(socket.id));
  var outputId = self.addNewClientOutput(ClientJson(socket.id));

  console.log("[Web Socket #'" + socket.id + "'] joined as JSON client [id=" + inputId + "]");

  update_list(); // ネットワーク更新
}

//  - ネットワークから離脱する
function exit_wsjson(socket) {
  var existed = false;
  existed |= self.deleteClientInput (self.socketId2clientId(socket.id, self.clients_input ));
  existed |= self.deleteClientOutput(self.socketId2clientId(socket.id, self.clients_output));

  if(existed){
    console.log("[Web Socket #'" + socket.id + "'] exited.");
  }

  update_list(); // ネットワーク更新
}


// websocketとしての応答内容を記述
function onWebSocket(socket){
  update_list(); // websocket接続時に一度現状を送る

  //  - ネットワークのノード間の接続/切断をする
  socket.on("add_connection", function (obj) {
    var inputId = obj.inputId, outputId = obj.outputId, connect = obj.connect

    if (connect == true){
      self.addConnection(inputId, outputId) // 接続
      console.log("input '" + inputId + "' connected to output '" + outputId + "'");
    } else {
      self.deleteConnection(inputId, outputId) // 切断
      console.log("input '" + inputId + "' and output '" + outputId + "' disconnected");
    }

    update_list(); // ネットワーク更新
  });

  // (2)のためのAPIは、(1)に加えて
  //  - wsjsonクライアントとしてネットワークに参加する
  socket.on("join_as_wsjson", function () { join_as_wsjson(socket); });

  //  - ネットワークから離脱する
  socket.on("exit_wsjson",    function () { exit_wsjson(socket); });

  //  - メッセージを受信する
  socket.on("message_json", function (obj) {
    var inputId  = self.socketId2clientId(socket.id, self.clients_input);

    if (inputId >= 0) { // joinしたクライアントだけがメッセージのやり取りに参加できる
      console.log("message from input #" + inputId);

      self.deliver(inputId, function(output){output.deliver(obj, "json");} ); // 配信
    }
  });
  // が必要。これらを関数化したjavascriptを配布する必要があるかも

  // (3)のためのAPIは、(1)に加えて
  //  - 指定のアドレス/ポート番号をoscクライアントとしてネットワークに追加する
  socket.on("join_as_osc", function (obj) {
    var inPort = 12345; // 受信ポートは指定が無ければサーバーが独自に決める

    // 入り口と出口のudpポートを作成する
    var _onRead = function(inputId){
      return function(msg, rinfo) {
        console.log("message from input #" + inputId);

        self.deliver(inputId, function(output){output.deliver(msg, "osc");} ); // 配信

      }
    }

    // socketのlistenに成功してからネットワークに登録したいので、idは先回りで受け取る
    self.oscsocks[inPort] = dgram.createSocket("udp4", _onRead(self.id_input));
    self.oscsocks[inPort].bind(inPort);

    // 接続ネットワークに参加する
    var inputId  = self.addNewClientInput (ClientOsc(obj.host, inPort));
    var outputId = self.addNewClientOutput(ClientOsc(obj.host, obj.port));

    console.log("[OSC #'" + obj.host + "'] joined as OSC client [id=" + inputId + "]");

    update_list(); // クライアントのネットワーク表示更新
  });
  //  - 指定のアドレス/ポート番号のoscクライアントをネットワークから除外する
  // が必要。oscアプリ本体とこのserver.jsのoscモジュールが直接メッセージをやり取りするので、
  // oscクライアントとの実通信にWebSocketは絡まない。あくまでコネクション管理のみ

  // ソケット自体の接続終了
  socket.on("disconnect", function () {
    exit_wsjson(socket); // 切断
  });

}

//==============================================================================
// MIDIの設定
//==============================================================================

// Set up a new input.
var midiObj = {
  input:  new midi.input(),  // port一覧を出すためのglobalな(openPortしない)inputを一つ用意しておく
  output: new midi.output(), // port一覧を出すためのglobalな(openPortしない)outputを一つ用意しておく

  inputs : {}, // 開いたportにつながっているmidiオブジェクト
  outputs: {}, // 開いたportにつながっているmidiオブジェクト

  setup_midiports: function(){
    // inputをopen
    for(var portId=0; portId<this.input.getPortCount(); ++portId){
      console.log("input  ", portId, this.input.getPortName(portId));

      // ネットワークに登録
      var inputId  = self.addNewClientInput (ClientMidi(portId, this.input.getPortName(portId)));

      // コールバックを作る(inputIdをキャプチャする)
      var _onMessage = function(_inputId){
        return function(deltaTime, message) {
          // The message is an array of numbers corresponding to the MIDI bytes:
          //   [status, data1, data2]
          // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
          // information interpreting the messages.
          var msg = {'msg': message, 'delta': deltaTime};
          console.log(msg);

          self.deliver(_inputId, function(output){output.deliver(message, "midi");} ); // 配信
        };
      }

      // 開く
      this.inputs[portId] = this.openInput(portId, _onMessage(inputId));
    }

    // outputをopen
    for(var portId=0; portId<this.output.getPortCount(); ++portId){
      console.log("output ", portId, this.output.getPortName(portId));

      // ネットワークに登録
      var outputId = self.addNewClientOutput(ClientMidi(portId, this.output.getPortName(portId)));

      // 開く
      this.outputs[portId] = new midi.output();
      this.outputs[portId].openPort(portId);
    }

    return;
  },

  openInput: function(port, callback){
    var this_input  = new midi.input();

    this_input.on('message', callback); // configure a callback.
    this_input.openPort(port);          // open port

    // Sysex, timing, and active sensing messages are ignored
    // by default. To enable these message types, pass false for
    // the appropriate type in the function below.
    // Order: (Sysex, Timing, Active Sensing)
    // For example if you want to receive only MIDI Clock beats
    // you should use
    // input.ignoreTypes(true, false, true)
    this_input.ignoreTypes(false, false, true);

    return this_input;
  }

}


//==============================================================================
// start!
//==============================================================================
// midiのコネクションを作成
midiObj.setup_midiports();

// PUBLIC_DIR以下を普通のhttpサーバーとしてlisten
var app = connect();
app.use(serveStatic(PUBLIC_DIR));
var server = http.createServer(app);
server.listen(LISTEN_PORT);

// websocketとしてlistenして、応答内容を記述
var io = socketio.listen(server);
io.sockets.on("connection", onWebSocket);

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
