//==============================================================================
// OSCクライアント
//==============================================================================

var type = "osc";
module.exports = {
  type: type,
  createInput: ClientOsc,
  createOutput: ClientOsc,
  init: function(serverHost){
  }
}

var osc         = require('osc-min');
var dgram       = require("dgram");
var g_oscSender = dgram.createSocket("udp4");

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
  return {address: msg.address, args: args}
}

function ClientOsc(name, emitter){
  var addr = name.split(':');
  var host = addr[0];
  var port = parseInt(addr[1]);
  return {
    type:      type,
    name:      name,
    key:       type + ":" + name,
    id:        undefined,
   
    sendMessage: function(msg){
      /*if(emitter){
          emitter(msg);
      }*/
      g_oscSender.send(msg, 0, msg.length, port, host);
    },

    decodeMessage: function(msg){
      var buf = fromBuffer(msg);
      return buf;
    },
    
    encodeMessage: function(buf){
      var msg = osc.toBuffer(buf);
      return msg;
    },

    simplify: function(){ return {type: type, name: this.name } },
  };
}
