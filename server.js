var os          = require('os');
var http        = require('http');
var connect     = require('connect');
var serveStatic = require('serve-static');
var socketio    = require("socket.io")
var dgram       = require("dgram");
var osc         = require('osc-min');
var fs          = require('fs');
var yargs       = require('yargs');
var usage       = require('usage');

var convert     = require('./convert')
var mididevs    = require('./mididevices') // require('midi');
var analyzer    = require('./analyzer')

var LISTEN_PORT      = 16080;
var PUBLIC_DIR       = __dirname + "/public"
var OSC_INPORT_BEGIN = 12345;

//ホームディレクトリに設定ファイルを保存
var dirHome = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];
var SETTING_FILE = dirHome + "/fm_mw1_setting.json";

//==============================================================================
// 全体の管理情報
//==============================================================================
function ClientJson(/*direction,*/ socketId, name){
  var type = "json";
  return {
    type:      type,
    socketId:  socketId,
    name:      name,
    key:       type + ":" + name,

    deliver: function(msg, msg_from){
      verboseLog("[sent to json client]", msg)
      g_io.to(this.socketId).emit("message_json", convert.convertMessage(msg, msg_from, type));
    },

    simplify: function(){ return {type: type, socketId: this.socketId, name: this.name} },
  };
}

function ClientOsc(/*direction,*/ host, port){
  var type = "osc";
  return {
    type:      type,
    host:      host, // 受信時には使わない
    port:      port,
    key:       type + ":" + host + ":" + port,

    deliver: function(msg, msg_from){
      var buf = convert.convertMessage(msg, msg_from, type)
      // console.log("*********")
      // console.log(msg)
      // console.log(this.port, this.host)
      verboseLog("[sent to osc  client]", msg)
      g_oscSender.send(buf, 0, buf.length, this.port, this.host);
    },

    simplify: function(){ return {type: type, host: this.host, port: this.port} },
  }
}

function ClientMidi(/*direction,*/ name){
  var type = "midi";
  return {
    type:      type,
    name:      name,
    key:       type + ":" + name,

    deliver: function(msg, msg_from){
      var buf = convert.convertMessage(msg, msg_from, type)
      verboseLog("[sent to midi client]", "[" + buf.join(", ") + "]")
      g_midiDevs.outputs[this.name].sendMessage(buf);
    },

    simplify: function(){ return {type: type, name: this.name} },
  };
}

//==============================================================================
// 分析
//==============================================================================

function ClientAnalyzer(/*direction,*/ name){
  var type = "analyzer";
  return {
    type:      type,
    name:      name,
    key:       type + ":" + name,

    deliver: function(msg, msg_from){
      var buf = convert.convertMessage(msg, msg_from, type)
      g_oscAnalyzer.analyze(buf, function(obj){
        g_io.sockets.emit("message_analyzer", {name: obj.name, output: obj});                
      });
    },

    simplify: function(){ return {type: type, name: this.name} },
  };
}

//==============================================================================
// プロトコルに依存しないクライアント一覧, コネクション設定に関する部分
//==============================================================================
function Clients(){ return {
  inputs:      {},
  outputs:     {},
  connections: {}, // {input_clientKey: {output_clientKey: true, ...}, ...}
  connectionsById: {}, // {input_clientId: {output_clientId: true, ...}, ...}
  id_input:    0, // 接続のユニークID
  id_output:   0, // 接続のユニークID

  //==============================================================================
  // id⇔key対応
  //==============================================================================

  key2ClientId: function(key, inputsOutputs){
   // key→クライアントID取得
   for(var id in inputsOutputs){
      if(inputsOutputs[id].key == key){
        return id;
      }
    }
    return undefined;
  },

  updateConnectionsById: function(){
    // {input_clientId: {output_clientId: true, ...}, ...} 形式での接続情報を作成
    var connectionsById = {};
    for(var inputId in this.inputs){
      var inputKey = this.inputs[inputId].key;
      if(inputKey in this.connections){
        connectionsById[inputId] = {};
        for(var outputId in this.outputs){
          var outputKey = this.outputs[outputId].key;
          if(outputKey in this.connections[inputKey]){
            if(this.connections[inputKey][outputKey]){
              connectionsById[inputId][outputId] = true;
            }
          }
        }
      }
    }
    this.connectionsById = connectionsById;
  },

  //==============================================================================
  // クライアント管理
  //==============================================================================
  addNewClientInput: function(client){
    this.inputs[this.id_input] = client;
    this.id_input += 1;
    this.updateConnectionsById();
    return this.id_input - 1;
  },

  addNewClientOutput: function(client){
    this.outputs[this.id_output] = client;
    this.id_output += 1;
    this.updateConnectionsById();
    return this.id_output - 1;
  },

  deleteClientInput: function(clientId){
    var existed = (clientId in this.inputs);
    if(existed){
      var inputKey = this.inputs[clientId].key;
      var type = this.inputs[clientId].type;
      delete this.inputs[clientId];

      if(type == "osc"){
        for(var outputKey in this.connections[inputKey]){
          this.deleteConnection(inputKey, outputKey);
        }
      }

      this.updateConnectionsById();
      // console.log(this.connections)
    }
    return existed;
  },

  deleteClientOutput: function(clientId){
    var existed = (clientId in this.outputs);
    if(existed){
      var type = this.outputs[clientId].type;
      delete this.outputs[clientId];

      if(type == "osc"){
        for(var inputKey in this.connections){
          for(var outputKey in this.connections[inputKey]){
            var outputId = this.key2ClientId(outputKey, this.outputs);
            if(outputId == clientId) this.deleteConnection(inputKey, outputKey);
          }
        }
      }

      this.updateConnectionsById();
      // console.log(this.connections)
    }
    return existed;
  },

  //==============================================================================
  // コネクション管理
  //==============================================================================

  addConnection: function(input_clientKey, output_clientKey){
    // 結線情報を作る
    if (! this.connections[input_clientKey]){
      this.connections[input_clientKey] = {};
    }
    this.connections[input_clientKey][output_clientKey] = true;
    this.updateConnectionsById();
  },

  deleteConnection: function(input_clientKey, output_clientKey){
    // 結線情報を切る
    if (this.connections[input_clientKey]){
      delete this.connections[input_clientKey][output_clientKey];
      this.updateConnectionsById();
    } else {
      // 何もしない
    }

  },

  cleanupConnectionHistory: function(){
    // 使われていない結線情報を削除する
    for(var inputKey in this.connections){
      if(this.key2ClientId(inputKey, this.inputs) === undefined){
        delete this.connections[inputKey];
        console.log("cleanupConnectionHistory: " + inputKey + " -> *");
      }else{
        for(var outputKey in this.connections[inputKey]){
          if(this.key2ClientId(outputKey, this.outputs) === undefined){
            delete this.connections[inputKey][outputKey];
            console.log("cleanupConnectionHistory: " + inputKey + " -> " + outputKey);
          }
        }
      }
    }
    this.updateConnectionsById();
  },

  //==============================================================================
  // 設定管理
  //==============================================================================

  emptySettings: function(){
    return {
      oscInputs: [],
      oscOutputs: [],
      connections: {}
    };
  },

  saveSettings: function(){
    // 設定の保存
    var settings = this.emptySettings();

    // OSC入力情報
    for(var inputId in this.inputs){
      if(this.inputs[inputId].type == "osc"){
        settings.oscInputs.push(this.inputs[inputId].simplify());
      }
    }

    // OSC出力情報
    for(var outputId in this.outputs){
      if(this.outputs[outputId].type == "osc"){
        settings.oscOutputs.push(this.outputs[outputId].simplify());
      }
    }

    // 結線情報
    settings.connections = this.connections;

    // 設定情報を保存
    var buf = JSON.stringify(settings);
    fs.writeFile(SETTING_FILE, buf, "utf-8", function (err) {
      console.log("saveSettings");
		});
  },

  loadSettings: function(){
    var settings = this.emptySettings();
    // 設定の読み込み
    if (fs.existsSync(SETTING_FILE)) {
      // 設定情報を読み込み
      var buf = fs.readFileSync(SETTING_FILE, "utf-8");
      settings = JSON.parse(buf);
    }
    return settings;
  },

  //==============================================================================
  // データ送信管理
  //==============================================================================
  // inputに届いたメッセージをコネクション先に配信
  deliver: function(input_clientId, data){
    for(var outputId in this.connectionsById[input_clientId]){
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

  // 初期化
  init : function(){
    var settings = this.clients.loadSettings();
    for(var i in settings.oscInputs){
       this.open_osc_input(settings.oscInputs[i]);
    }
    for(var i in settings.oscOutputs){
       this.open_osc_output(settings.oscOutputs[i]);
    }
    // Analyzer
    this.open_analyzer_output("Analyzer");

    this.clients.connections = settings.connections;
    this.clients.updateConnectionsById();
    this.update_list(); // ネットワーク更新
  },

  // ネットワーク接続者一覧を表示する(socketだからサーバー側からpush可能)
  update_list : function(){
    // メソッド類は削ぎ落として表示に必要な情報だけまとめる
    var inputs  = {}; for (var i in this.clients.inputs ) inputs [i] = this.clients.inputs [i].simplify();
    var outputs = {}; for (var o in this.clients.outputs) outputs[o] = this.clients.outputs[o].simplify();
    // broadcast all clients (including the sender)
    g_io.sockets.emit("update_list", {inputs: inputs, outputs: outputs, connections: this.clients.connectionsById});
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

  // wsjsonクライアントとしてネットワークに参加する
  join_as_wsjson : function(socket, param) {
    var changed = false;
    var name = param && param.name ? param.name : socket.id; // nameパラメータがなければidを使用
    if (this.clients.socketId2InputClientId(socket.id) < 0){
      var inputId  = this.clients.addNewClientInput (ClientJson(socket.id, name));
      console.log("[Web Socket #'" + socket.id + "'] joined as JSON input client [id=" + inputId + "]");
      changed = true;
    }
    if (this.clients.socketId2OutputClientId(socket.id) < 0){
      var outputId = this.clients.addNewClientOutput(ClientJson(socket.id, name));
      console.log("[Web Socket #'" + socket.id + "'] joined as JSON output client [id=" + outputId + "]");
      changed = true;
    }

    if(changed) this.update_list(); // ネットワーク更新
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

  // OSC送受信ポートアドレスの確認（仮）
  is_valid_osc_port : function(host, port) {
    // 無効なホストやポートの場合は false
    if(!host || !port) return false;
    var p = parseInt(port);
    if(p < 1 || p > 65535) return false;
    return true;
  },

  //  - このサーバーのOSC受信ポートを追加する
  open_osc_input : function(obj) {
    var inHost = "localhost";
    var inPort = obj.port;
    if(this.is_valid_osc_port(inHost, inPort)){
      // 受信ハンドラ
      var _onRead = function(inputId, msg, rinfo) {
        // console.log("message from input #" + inputId);

        this.clients.deliver(inputId, msg); // 配信
      }

      // socketのlistenに成功してからネットワークに登録したいので、idは先回りで受け取る
      this.oscsocks[inPort] = dgram.createSocket("udp4", _onRead.bind(this, this.clients.id_input));
      this.oscsocks[inPort].bind(inPort);

      // 接続ネットワークに参加する
      var inputId  = this.clients.addNewClientInput (ClientOsc(inHost, inPort));

      console.log("Port:" + inPort + " opened for listening OSC (client id=" + inputId + ")");
    }
  },
  open_new_osc_input : function() {
    // 受信ポートはサーバーが独自に決める
    var inPort = OSC_INPORT_BEGIN;
    for(var _i in this.oscsocks){
      var i = parseInt(_i);
      if (inPort <= i) inPort = i+1;
    }
    this.open_osc_input({port: inPort});
    this.clients.saveSettings()
    this.update_list(); // クライアントのネットワーク表示更新
  },

  //  - 指定のアドレス/ポート番号をoscクライアントとしてネットワークに追加する
  open_osc_output : function(obj) {
    if(this.is_valid_osc_port(obj.host, obj.port)){
      // 接続ネットワークに参加する
      var outputId = this.clients.addNewClientOutput(ClientOsc(obj.host, obj.port));

      console.log("[OSC #'" + obj.host + "'] joined as OSC client [id=" + outputId + "]");
    }
  },
  open_new_osc_output : function(obj) {
    this.open_osc_output(obj);
    this.clients.saveSettings()
    this.update_list(); // クライアントのネットワーク表示更新
  },

  //  - このサーバーのOSC受信ポートを削除する
  close_osc_input : function(obj) {
    var inputId = obj.inputId;
    if(this.clients.deleteClientInput (inputId)){
      console.log("close_osc_input:" + inputId);
    }
    this.clients.saveSettings()
    this.update_list(); // クライアントのネットワーク表示更新
  },

  //  - このサーバーのOSC送信ポートを削除する
  close_osc_output : function(obj) {
    var outputId = obj.outputId;
    if(this.clients.deleteClientOutput (outputId)){
      console.log("close_osc_output:" + outputId);
    }
    this.clients.saveSettings()
    this.update_list(); // クライアントのネットワーク表示更新
  },

  //  - このサーバーの仮想Midi送信ポートを追加する
  open_analyzer_output : function(name) {
    var outputId = this.clients.addNewClientOutput(ClientAnalyzer(name));
    console.log("Analyzer Output [" + name + "] (client id=" + outputId + ").");
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
    socket.on("join_as_wsjson",      this.join_as_wsjson.bind(this, socket) ); // wsjsonクライアントとしてネットワークに参加する
    socket.on("exit_wsjson",         this.exit_wsjson.bind(this, socket) );    // ネットワークから離脱する
    socket.on("message_json",        this.message_json.bind(this, socket) );   // JSONメッセージを受信する

    // (3)のためのAPI
    socket.on("open_new_osc_input",  this.open_new_osc_input.bind(this) );       // OSC受信ポートを増やす
    socket.on("open_new_osc_output", this.open_new_osc_output.bind(this) );      // OSC送信先を登録する
    socket.on("close_osc_input",     this.close_osc_input.bind(this) );          // 開いた受信ポートを閉じる
    socket.on("close_osc_output",    this.close_osc_output.bind(this) );         // OSC送信先を閉じる
    // oscアプリ本体とこのserver.jsのoscモジュールが直接メッセージをやり取りするので、
    // oscクライアントとの実通信にWebSocketは絡まない。あくまでコネクション管理のみ

    // ソケット自体の接続終了
    socket.on("disconnect",          this.exit_wsjson.bind(this, socket) );
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

      // if (message.length != 1 || message[0] != 0xF8) console.log(msg); // log

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
// command line parse
//==============================================================================
var argv = yargs
    .help   ('h').alias('h', 'help')
    .boolean('t').alias('t', 'test'   ).default('t', false)
    .boolean('v').alias('v', 'verbose').default('v', false)
    // .options('x', {alias : 'xxxx', default : ""})
    .argv;

// set verbose
var verboseLog = argv.verbose ? console.log : function(){}

// set cpu usage
if(argv.test){
  setInterval(function (){
    usage.lookup(process.pid, function(err, result) {
      console.log('[USAGE] cpu: ' + result.cpu + ', memory: ' + result.memory);
    });
  }, 1000);
}

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
var g_oscAnalyzer = analyzer.OscAnalyzer();

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
var interfaces = os.networkInterfaces()
for (var dev in interfaces) {
  interfaces[dev].forEach(function(iface){
    if ((! iface.internal) && iface.family === "IPv4"){
      console.log("connection control at http://" + iface.address + ":" + LISTEN_PORT + "/");
    }
  });
}
console.log("================================================");

// 初期化
g_app.init();

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
