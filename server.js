var fs       = require("fs");
var http     = require('http');
var socketio = require("socket.io")
var midi     = require('midi');

var LISTEN_PORT = 8080;

//==============================================================================
// 全体の管理情報
//==============================================================================
function Client(socket){
  return {
    socket: socket,
  };
}

var self = {
  clients: {}, // socket.id: name

  midi: {
    opened_input_ports:  [],
    opened_output_ports: [],
  },
};

//==============================================================================
// WebSocketの設定
//==============================================================================

// 普通のhttpサーバーとしてlisten
var server = http.createServer(function(req, res) {
  res.writeHead(200, {"Content-Type":"text/html"});
  var output = fs.readFileSync("./index.html", "utf-8"); // カレントディレクトリのindex.htmlを配布
  res.end(output);
}).listen(LISTEN_PORT);

// websocketとしてlistenして、応答内容を記述
var io = socketio.listen(server);
io.sockets.on("connection", function (socket) {
  // (1) ただweb設定画面を見に来た人と、
  // (2) WebSocket-JSON (以下wsjson) でネットワークに参加しにきた人と、
  // (3) OSCでネットワークに参加しにきた人は別扱いする必要がある

  // (1)のためのAPI
  //  - ネットワーク接続者一覧を表示する
  //  - ネットワークのノード間の接続/切断をする

  // (2)のためのAPIは、(1)に加えて
  //  - wsjsonクライアントとしてネットワークに参加する
  //  - ネットワークから離脱する
  //  - メッセージを送信する
  // が必要。これらを関数化したjavascriptを配布する必要があるかも

  // (3)のためのAPIは、(1)に加えて
  //  - 指定のアドレス/ポート番号をoscクライアントとしてネットワークに追加する
  //  - 指定のアドレス/ポート番号のoscクライアントをネットワークから除外する
  // が必要。oscアプリ本体とこのserver.jsのoscモジュールが直接メッセージをやり取りするので、
  // oscクライアントとの実通信にWebSocketは絡まない。あくまでコネクション管理のみ

  // 接続開始
  socket.on("connected", function (obj) {
    console.log("client '" + obj.name + "' connected.");
    self.clients[socket.id] = Client(socket, obj.name)
  });

  socket.on("publish", function (obj) {
    // broadcast all clients (including the sender)
    io.sockets.emit("publish", obj);
  });

  // 接続終了
  socket.on("disconnect", function () {
    if (self.clients[socket.id]) {
      console.log("client '" + self.clients[socket.id].name + "' disconnected.");
      delete self.clients[socket.id];
    }
  });

});

console.log("listening connections...")

//==============================================================================
// MIDIの設定
//==============================================================================

// Set up a new input.
var midiObj = {
  input:  new midi.input(),
  output: new midi.output(),

  print_midiports: function(){
    for(var i=0; i<this.input.getPortCount(); ++i){
      console.log("input  ", i, this.input.getPortName(i));
    }
    for(var i=0; i<this.input.getPortCount(); ++i){
      console.log("output ", i, this.input.getPortName(i));
    }
    return;
  },

  setup: function(input_port, output_port){
    // Configure a callback.
    this.input.on('message', function(deltaTime, message) {
      // The message is an array of numbers corresponding to the MIDI bytes:
      //   [status, data1, data2]
      // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
      // information interpreting the messages.
      console.log('m:' + message + ' d:' + deltaTime);

      // broadcast all clients (including the sender)
      io.sockets.emit("publish", {value: 'm:' + message + ' d:' + deltaTime});
    });

    // Open the first available input port.
    this.input.openPort(input_port);

    // Sysex, timing, and active sensing messages are ignored
    // by default. To enable these message types, pass false for
    // the appropriate type in the function below.
    // Order: (Sysex, Timing, Active Sensing)
    // For example if you want to receive only MIDI Clock beats
    // you should use
    // input.ignoreTypes(true, false, true)
    this.input.ignoreTypes(false, true, true);

    // Open the first available input port.
    this.output.openPort(output_port);

    // ... receive MIDI messages ...
  },
}

midiObj.print_midiports();
midiObj.setup(1, 0);

// Close the port when done.
//midiObj.input.closePort();
