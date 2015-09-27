var fs       = require("fs");
var http     = require('http');
var socketio = require("socket.io")
var midi     = require('midi');

//==============================================================================
// 全体の管理情報
//==============================================================================
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
}).listen(8080);

// websocketとしてlistenして、応答内容を記述
var io = socketio.listen(server);
io.sockets.on("connection", function (socket) {
  console.log("listening connections...")

  // 接続開始カスタムイベント(接続元ユーザを保存し、他ユーザへ通知)
  socket.on("connected", function (name) {
    console.log("client '" + name + "' connected.");
    self.clients[socket.id] = name;
    // io.sockets.emit("publish", {value: msg});
  });

  // 接続終了組み込みイベント(接続元ユーザを削除し、他ユーザへ通知)
  socket.on("disconnect", function () {
    if (self.clients[socket.id]) {
      var name = self.clients[socket.id];
      console.log("client '" + name + "' disconnected.");
      delete self.clients[socket.id];
      // io.sockets.emit("publish", {value: msg});
    }
  });

  // メッセージ送信カスタムイベント
  socket.on("publish", function (data) {
    io.sockets.emit("publish", {value: data.value});
  });
});

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
