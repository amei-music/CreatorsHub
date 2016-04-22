//==============================================================================
// 入出力クライアントとコネクション設定管理
//==============================================================================

module.exports = {
  create: Clients,
}

var fs          = require('fs');

//ホームディレクトリに設定ファイルを保存
var dirHome = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"];
var SETTING_FILE = dirHome + "/fm_mw1_setting.json";

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
    client.id = this.id_input;
    this.inputs[client.id] = client;
    this.id_input += 1;
    this.updateConnectionsById();
    return client.id;
  },

  addNewClientOutput: function(client){
    client.id = this.id_output;
    this.outputs[client.id] = client;
    this.id_output += 1;
    this.updateConnectionsById();
    return client.id;
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
    var input = this.inputs[input_clientId];
    var buf = input.decodeMessage(data);
    for(var outputId in this.connectionsById[input_clientId]){
      var output = this.outputs[outputId];
      var msg = output.encodeMessage(buf);
      output.sendMessage(msg); // いわゆるダブルディスパッチ
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

  // 名前からcliendIDに変換
  name2ClientId : function(type, name, inputsOutputs){
    for (var k in inputsOutputs) {
      var client = inputsOutputs[k];
      if(client.type == type && client.name == name){
        return k;
      }
    }
    return -1;
  },
  name2InputClientId  : function(type, name){ return this.name2ClientId(type, name, this.inputs ); },
  name2OutputClientId : function(type, name){ return this.name2ClientId(type, name, this.outputs); },

}}
