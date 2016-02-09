"use strict";

// 4分音符に24回届くtimingメッセージを元に適当にテンポを推定する
var Timing = function(){
  return {
    running: false, // startを受けてtrue, stopを受けてfalse

    starttime: 0, // startを受けた時の時刻
    count:     0, // startからの累積カウント
    tempo:     0,

    onBeat: function(tempo){}, // 四分音符で何するか

    onStart : function(){
      this.running   = true;
      this.starttime = new Date().getTime();
    },

    onStop : function(){
      this.running = false;
      this.count   = 0;
    },

    onTiming : function(){
      if (this.count % 24 == 0) this.onBeat(this.tempo);
      if (this.count > 0){
        var elapsed = new Date().getTime() - this.starttime; // 再生中のテンポ変更はNG
        this.tempo   = 60. * 1000. / ((elapsed / this.count) * 24);
      }
      this.count += 1;
    },

    get : function(obj){
      if(obj.address == "/fm/start")  return this.onStart();
      if(obj.address == "/fm/timing") return this.onTiming();
      if(obj.address == "/fm/stop")   return this.onStop();
    }
  };
}

// デバイス名を作る
function makeNodeName(client){
  var name = client.type + "> ";
  if (client.type == "json"){
    if(client.name){
      name += client.name;
    }else{
      name += client.name + " socket[" + client.socketId + "]";
    }

  }
  if (client.type == "midi" || client.type == "vmidi" || client.type == "rtp") name += client.name;
  if (client.type == "osc" ) name += client.host + ":" + client.port;
  return name
}

// 削除可能な入出力かどうか
function isClientRemovableIO(client){
  return client.type == "osc" || client.type == "vmidi"; // OSCと仮想MIDIは削除可能
}

// プレーンテキストで接続状態を表示する
function makeConnectionString(inputs, outputs, connections){
  var txt = "[network and connection information]<br>"
  for (var inputId in inputs){
    txt += "input _" + inputId + ", [" + makeNodeName(inputs[inputId]) + "]<br>"
  }

  for (var outputId in outputs){
    txt += "output_" + outputId + ", [" + makeNodeName(outputs[outputId]) + "]<br>"
  }

  for (var inputId in connections){
    for (var outputId in connection[inputId]){
      txt += "connection from input " + inputId + " => output " + outputId + "<br>"
    }
  }
  return txt;
}


// N個のdevice名を記した配列を受け取ってその接続マトリックスのhtmlを作る
function makeConnectionTable(obj, onChange, onRemoveOscInput, onRemoveOscOutput){
  //////////////////////////////
  // 表示用情報作成

  // 入力側の表示情報作成
  var inputNames  = {};
  var inputIdList = [];
  var isRemovableInputs  = {};
  for(var inputId  in obj.inputs ){
    inputNames[inputId] = makeNodeName(obj.inputs[inputId]);
    isRemovableInputs[inputId] = isClientRemovableIO(obj.inputs[inputId]);
    inputIdList.push(inputId);
  }
  // 出力側の表示情報作成
  var outputNames = {};
  var outputIdList = [];
  var isRemovableOutputs  = {};
  for(var outputId in obj.outputs){
    outputNames[outputId] = makeNodeName(obj.outputs[outputId]);
    isRemovableOutputs[outputId] = isClientRemovableIO(obj.outputs[outputId]);
    outputIdList.push(outputId);
  }
  // 入出力IDを名前順にソート
  inputIdList.sort(function(a, b){
    if(inputNames[a] < inputNames[b]) return -1;
    if(inputNames[a] > inputNames[b]) return 1;
    return 0;
  });
  outputIdList.sort(function(a, b){
    if(outputNames[a] < outputNames[b]) return -1;
    if(outputNames[a] > outputNames[b]) return 1;
    return 0;
  });
  // 接続状態
  var connections = obj.connections;

  //////////////////////////////
  // テーブル作成

  var table = document.createElement('table');
  // thead
  var thead = table.createTHead();
  // タイトル行
  for(var i = 0; i <= 1; i++){
    var tr = thead.insertRow(-1)
    var cell = document.createElement('th');
    tr.appendChild(cell);
    if(i == 0){
      cell.innerHTML = "OUT";
      cell.style.textAlign = "right";
    }else{
      cell.innerHTML = "IN"; 
      cell.style.textAlign = "left";
    }
    for(var o = 0; o < outputIdList.length; o++){
      var outputId = outputIdList[o];
      var cell = document.createElement('th');
      tr.appendChild(cell);
      if(i == 0){
        cell.innerHTML = outputNames[outputId];
        if(isRemovableOutputs[outputId]){
          var btnRemove = document.createElement("button");
          btnRemove.innerText = "削除";
          btnRemove.addEventListener('click', onRemoveOscOutput.bind(null, parseInt(outputId)));
          cell.appendChild(btnRemove);
        }
      }else{
        cell.innerHTML = "▲";
      }
      // エラー表示
      if(obj.outputs[outputId].error){
        if(i == 1){
            cell.innerHTML = "×";
        }
        cell.className = "error";
      }
    }
  }


  // tbody
  var tbody = table.createTBody();
  // データ行
  console.log("connections: ", JSON.stringify(connections));
  for(var i = 0; i < inputIdList.length; i++){
    var inputId = inputIdList[i];
    var tr = tbody.insertRow(-1);
    var cell = document.createElement('th');
    tr.appendChild(cell);
    cell.innerHTML = "▶ " + inputNames[inputId];
    if(isRemovableInputs[inputId]){
      var btnRemove = document.createElement("button");
      btnRemove.innerText = "削除";
      btnRemove.addEventListener('click', onRemoveOscInput.bind(null, parseInt(inputId)));
      cell.appendChild(btnRemove);
    }
    for(var o = 0; o < outputIdList.length; o++){
      var outputId = outputIdList[o];
      (function(inputId, outputId){ // capture variables
        var isNowConnected = (inputId in connections) && (outputId in connections[inputId]);

        // 接続/切断ボタンを作って追加
        var cell = document.createElement('td');
        if(isNowConnected){
          cell.className = "connected";
          cell.innerText = "Connected";
        }else{
          cell.className = "disconnected";
          cell.innerText = "-";
        }
        cell.addEventListener('click', function(){ onChange(inputId, outputId, (! isNowConnected)) } );
        tr.appendChild(cell);

      })(inputId, outputId);
    }
  }

  return table;
}


// 本体
var ctrl = {
  init: function(){
    // ソケットの初期化
    this.socket = io.connect(/*'http://localhost:8080'*/);
    this.socket.on("update_list",  this.onUpdateList.bind(this));
    this.socket.on("message_json", this.onMessageJson.bind(this));
    this.socket.on("disconnect",   this.onDisconnect.bind(this));

    // UIを初期化
    this.showJsonClient(false);

    // サブモジュールにハンドラを付ける
    this.timing.onBeat = function(tempo){
      document.getElementById("tempo").innerHTML = tempo;
    };
  },

  onUpdateList: function(obj){
    // htmlのtableでコネクションマトリックスを作る
    // マトリックス内のボタンクリックでサーバーに接続変更を指示する
    var table = makeConnectionTable(obj, this.add_connection.bind(this), this.close_osc_input.bind(this), this.close_osc_output.bind(this));
    var networkArea = document.getElementById("network");
    networkArea.textContent = null;
    networkArea.appendChild(table);
  },

  onMessageJson : function(obj){
    this.addMessage(obj);
    this.timing.get(obj);
  },

  onDisconnect : function(){
    this.showJsonClient(false);
  },

  add_connection : function(inputId, outputId, connect){
    var param = {inputId: inputId, outputId: outputId, connect: connect}
    console.log("add_connection: " + JSON.stringify(param));
    this.socket.emit("add_connection", param);
  },

  cleanup_connection_history : function(){
    this.socket.emit("cleanup_connection_history");
  },

  join_as_wsjson: function() {
    this.socket.emit("join_as_wsjson", { "name": "mw1"} );
    this.showJsonClient(true);
  },

  exit_wsjson: function() {
    this.socket.emit("exit_wsjson");
    this.showJsonClient(false);
  },

  open_new_osc_input: function() {
    this.socket.emit("open_new_osc_input");
  },

  open_new_osc_output: function() {
    var host = document.getElementById('osc_host');
    var port = document.getElementById('osc_port');
    this.socket.emit("open_new_osc_output", {host: host.value, port: port.value});
  },

  close_osc_input: function(inputId) {
    var param = {inputId: inputId};
    console.log("close_osc_input: " + JSON.stringify(param));
    this.socket.emit("close_osc_input", param);
  },

  close_osc_output: function(outputId) {
    var param = {outputId: outputId};
    console.log("close_osc_output: " + JSON.stringify(param));
    this.socket.emit("close_osc_output", param);
  },

  open_new_virtualmidi_input: function() {
    this.socket.emit("open_new_virtualmidi_input");
  },

  open_new_virtualmidi_output: function() {
    this.socket.emit("open_new_virtualmidi_output");
  },

  close_virtualmidi_input: function(inputId) {
    var param = {inputId: inputId};
    this.socket.emit("close_virtualmidi_input", param);
  },

  close_virtualmidi_output: function(outputId) {
    var param = {outputId: outputId};
    this.socket.emit("close_virtualmidi_output", param);
  },

  publishMessage: function(msg, callback) {
    var textInput = document.getElementById('msg_input');
    try{
      var obj = JSON.parse(textInput.value);
      this.socket.emit("message_json", obj);
      document.getElementById("errormsg").innerHTML = "";
    } catch(e){
      document.getElementById("errormsg").innerHTML = "json syntax error";
    }
  },

  // フィルターのon/offを切り替える
  filterSet : function(cbox){
    if (cbox.checked) this.filter[cbox.value] = true;
    else delete this.filter[cbox.value];

    console.log(cbox, cbox.checked, this.filter);
  },

  // jsonクライアントとして受けとったメッセージを追加する
  addMessage : function(obj){
    // console.log(obj.address, this.filter)
    if (! (obj.address in this.filter)){ // filter考慮
      var domMeg = document.createElement('div');
      // domMeg.innerHTML = new Date().toLocaleTimeString() + ' ' + msg;
      domMeg.innerHTML = JSON.stringify(obj);
      document.getElementById("msg").appendChild(domMeg)
    }
  },

  // jsonクライアントの表示/非表示を切り替える
  showJsonClient : function(onoff){
    document.getElementById("jsonclient").style.display = (onoff ? "block" : "none");
    document.getElementById("jsonclient_join").style.display = (onoff ? "none" : "block");
  },

  // members
  socket: undefined, // Web Socket クライアント
  filter: {},        // メッセージをフィルタする
  timing: Timing(),  // テンポ計算
}
