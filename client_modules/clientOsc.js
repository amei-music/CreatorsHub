//==============================================================================
// OSCクライアント
//==============================================================================

var type = "osc";
var host;

module.exports = {
  type: type,
  createInput: function(name){
    var input = ClientOsc(name);
    input.listenMessage();
    return input;
  },
  createOutput: ClientOsc,
  init: function(hostAPI){
    host = hostAPI;
  }
}

var osc         = require('osc-min');
var dgram       = require("dgram");
var g_oscSender = dgram.createSocket("udp4");
var oscsocks    = {}; // {input_oscport: {clientId: , sock: }} osc送受信オブジェクトを詰めておくところ

var keyvalue    = "/keyvalue";

function toBuffer(msg){
    var address = msg.address;
    var args = msg.args;
    if(address && args){
        // argsがObjectの場合はプロパティ名をアルファベット順に並べてアドレス側に書く
        // (例) /address/keyvalue_aa_bb_xx
        if(!(args instanceof Array)){
            if(args instanceof Object){
                var props = Object.getOwnPropertyNames(args);
                props.sort();
                address += keyvalue;
                var newargs = [];
                for(var i = 0; i < props.length; i++){
                    address += "_" + props[i];
                    newargs[i] = args[props[i]];
                }
                args = newargs;
            }
        }
    }else{
        address = "";
        args = [];
        console.log("toBuffer: bad format")
    }
    return osc.toBuffer({address: address, args: args});
}

function fromBuffer(msgbuf){
  // osc.fromBufferは丁寧すぎるレイアウトで返すので使いづらい
  // とりあえず自前で作ってみる。例外処理全然できてない
  var msg  = osc.fromBuffer(msgbuf);
   if (msg.oscType == "bundle") {
    msg = msg.elements[0];
  }

  var args = new Array(msg.args.length);
  for (var i in msg.args){
    args[i] = msg.args[i].value;
  }
  var address = msg.address.split(keyvalue + "_");
  if(address.length > 1){
      // アドレスがkeyvalueを含む場合Objectに変換する
      var props = address[1].split("_");
      var newargs = {};
      for(var i = 0; i < props.length; i++){
          newargs[props[i]] = args[i];
      }
      args = newargs;
  }
  return {address: address[0], args: args}
}

function ClientOsc(name, emitter){
  var token = name.split(':');
  var addr = token[0];
  var port = parseInt(token[1]);
  return {
    type:      type,
    name:      name,
    key:       type + ":" + name,
    id:        undefined,
   
    listenMessage: function(){
      var listener = dgram.createSocket("udp4");
      listener.on("message", function(msg, rinfo) {
        host.deliverMessage(this.id, msg); // 配信
      }.bind(this));
      listener.bind(port);
      oscsocks[port] = listener;      
    },
    
    sendMessage: function(msg){
      g_oscSender.send(msg, 0, msg.length, port, addr);
    },

    decodeMessage: function(msg){
      var buf = fromBuffer(msg);
      return buf;
    },
    
    encodeMessage: function(buf){
      var msg = toBuffer(buf);
      return msg;
    },

    simplify: function(){ return {type: type, name: this.name } },
  };
}
