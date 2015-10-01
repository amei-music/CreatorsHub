var fs       = require("fs");
var http     = require('http');
var socketio = require("socket.io")
var midi     = require('midi');
var dgram    = require("dgram");
var osc      = require('osc-min');

var LISTEN_PORT = 16080;

oscSender = dgram.createSocket("udp4")

//==============================================================================
// 汎用関数
//==============================================================================
function midi2obj(msg){
  // ただのバイト列であるmidiをそれっぽいOSCに変換して返す

  if ( msg.length == 3 && ((msg[0] >> 4) == 9) && (msg[2] >  0) ){
    // note on
    var ch = (msg[0] & 0x0F), noteNum = msg[1], velo = msg[2];
    return {
      address: "/fm/noteon",
      args:    [ch, noteNum, velo]
    };

  } else if ( msg.length == 3 && ((msg[0] >> 4) == 9) && (msg[2] == 0) ){
    // note off with status 9
    var ch = (msg[0] & 0x0F), noteNum = msg[1], velo = 0x40;
    return {
      address: "/fm/noteoff",
      args:    [ch, noteNum, velo]
    };

  } else if ( msg.length == 3 && ((msg[0] >> 4) == 8) ){
    // note off with status 8
    var ch = (msg[0] & 0x0F), noteNum = msg[1], velo = msg[2];
    return {
      address: "/fm/noteoff",
      args:    [ch, noteNum, velo]
    };

  } else if ( msg.length == 3 && ((msg[0] >> 4) == 0xA) ){
    // polyphonic pressure
    var ch = (msg[0] & 0x0F), noteNum = msg[1], press = msg[2];
    return {
      address: "/fm/notepressure",
      args:    [ch, noteNum, press]
    };

  } else if ( msg.length == 3 && ((msg[0] >> 4) == 0xB) ){
    // control change
    var ch = (msg[0] & 0x0F), type = msg[1], value = msg[2];
    return {
      address: "/fm/controlchange",
      args:    [ch, type, value]
    };

  } else if ( msg.length == 2 && ((msg[0] >> 4) == 0xC) ){
    // program change
    var ch = (msg[0] & 0x0F), number = msg[1];
    return {
      address: "/fm/programchange",
      args:    [ch, number]
    };

  } else if ( msg.length == 2 && ((msg[0] >> 4) == 0xD) ){
    // channel pressure
    var ch = (msg[0] & 0x0F), value = msg[1];
    return {
      address: "/fm/channelpressure",
      args:    [ch, value]
    };

  } else if ( msg.length == 3 && ((msg[0] >> 4) == 0xE) ){
    // pitch bend
    var ch = (msg[0] & 0x0F), msb = msg[1], lsb = msg[2];
    return {
      address: "/fm/pitchbend",
      args:    [ch, msb, lsb]
    };

  } else if ( msg.length == 1 && msg[0] == 0xF8 ){
    // timing clock
    return {
      address: "/fm/timing",
      args:    []
    };

  } else if ( msg.length == 1 && msg[0] == 0xFA ){
    // start
    return {
      address: "/fm/start",
      args:    []
    };

  } else if ( msg.length == 1 && msg[0] == 0xFB ){
    // continue
    return {
      address: "/fm/continue",
      args:    []
    };

  } else if ( msg.length == 1 && msg[0] == 0xFC ){
    // stop
    return {
      address: "/fm/stop",
      args:    []
    };

  } else {
    // 残りはそのまま送信
    return {
      address: "/fm/midi_bytes",
      args:    msg
    };

  }
}

function obj2midi(msg){
  if(msg.address == "/fm/noteon"){
    var ch = msg.args[0], noteNum = msg.args[1], velo = msg.args[2];
    if (ch < 16) return [0x90 + (ch & 0x0F), noteNum, velo];
    else         return [0x90 + (ch & 0x0F), noteNum, velo]; // 要対応
  } else if(msg.address == "/fm/noteoff"){
    var ch = msg.args[0], noteNum = msg.args[1], velo = msg.args[2];
    if (ch < 16) return [0x80 + (ch & 0x0F), noteNum, velo];
    else         return [0x80 + (ch & 0x0F), noteNum, velo]; // 要対応
  } else if (msg.args){
    // msg.argsがあれば、それを送信
    return msg.args
  } else {
    // 特に形状が無ければ、stringifyしてそのままSysExにしてみる
    // 本当は8bit -> 7bit変換が必要だが、暫定対応でそのまま流してみる
    // このあたりを追求すればUSB-MIDIを「IPに依存しない汎用シリアル通信路」としてもうちょっと訴求できる気がする
    // 言い換えればUSB-MIDIにJSON流して現代的なプログラマも気軽に電子工作できる？
    var varlen = function(val){
      var size = 1;
      var tmp = val >> 7;
      while (tmp != 0){
        size += 1;
        tmp = tmp >> 7;
      }
      var ret = new Array(size);
      ret[size - 1] = val & 0x7F;
      for (var i=size-2; i>=0; --i){
        val = val >> 7;
        ret[i] = (val & 0x7F) | 0x80;
      }
      return ret;
    }

    var buf = JSON.stringify(msg);
    var ret = [0xF0, 0x7C] // 0x7D: 非営利, 0x7E: ノンリアルタイム, 0x7F: リアルタイムなので、0x7Cにしてみる
    var bytes = Array.prototype.map.call(buf, function(c){ return c.charCodeAt(0); });
    Array.prototype.push.apply(ret, varlen(buf.length));
    Array.prototype.push.apply(ret, bytes);
    Array.prototype.push.apply(ret, [0xF7]);
    return ret;
  }
}

function convert_message(msg, msg_from, msg_to){
  if(msg_from == msg_to) return msg; // そのまま

  if(msg_from == "json"){
    if(msg_to == "osc" ) return osc.toBuffer(msg);
    if(msg_to == "midi") return obj2midi(msg);
  }
  if(msg_from == "osc"){
    if(msg_to == "json") return osc.fromBuffer(msg); // 失敗するとthrow
    if(msg_to == "midi") return obj2midi(osc.fromBuffer(msg));
  }
  if(msg_from == "midi"){
    if(msg_to == "json") return midi2obj(msg); // OSCっぽいjsonなのでそのまま送信可
    if(msg_to == "osc" ) return osc.toBuffer(midi2obj(msg)); // 文字列にする
  }
}

//==============================================================================
// 全体の管理情報
//==============================================================================
function ClientJson(/*direction,*/ socketId){
  return {
    type:      "json",
    socketId:  socketId,

    deliver: function(msg, msg_from){
      io.to(this.socketId).emit("message_json", convert_message(msg, msg_from, "json"));
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
      var buf = convert_message(msg, msg_from, "osc")
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
      var buf = convert_message(msg, msg_from, "midi")
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
    delete this.clients_input[clientId];

    for(var outputId in this.connections[clientId]){
      this.deleteConnection(clientId, outputId);
    }

    // console.log(this.connections)
    return;
  },

  deleteClientOutput: function(clientId){
    delete this.clients_output[clientId];

    for(var inputId in this.connections){
      for(var outputId in this.connections[inputId]){
        if(outputId == clientId) this.deleteConnection(inputId, outputId);
      }
    }

    // console.log(this.connections)
    return;
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
  self.deleteClientInput (self.socketId2clientId(socket.id, self.clients_input ));
  self.deleteClientOutput(self.socketId2clientId(socket.id, self.clients_output));

  console.log("[Web Socket #'" + socket.id + "'] exited.");

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

// 普通のhttpサーバーとしてlisten
var server = http.createServer(function(req, res) {
  res.writeHead(200, {"Content-Type":"text/html"});
  var output = fs.readFileSync("./index.html", "utf-8"); // カレントディレクトリのindex.htmlを配布
  res.end(output);
}).listen(LISTEN_PORT);

// websocketとしてlistenして、応答内容を記述
var io = socketio.listen(server);
io.sockets.on("connection", onWebSocket);

console.log("================================================");
console.log("listening web socket on port " + LISTEN_PORT);
console.log("connection control at http://localhost:" + LISTEN_PORT + "/");
console.log("================================================");
