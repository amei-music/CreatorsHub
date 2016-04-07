//==============================================================================
// OSCクライアント
//==============================================================================

module.exports = {
  create: ClientOsc,
}

var osc         = require('osc-min');

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
  var type = "osc";
  return {
    type:      type,
    name:      name,
    key:       type + ":" + name,
    
    sendMessage: function(msg){
      if(emitter){
          emitter(msg);
      }
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
  }
}
