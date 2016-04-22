//==============================================================================
// JSONクライアント
//==============================================================================

var type = "json";
module.exports = {
  type: type,
  createInput: ClientJson,
  createOutput: ClientJson,
  init: function(serverHost){
  }
}

function ClientJson(name, emitter){
  return {
    type:      type,
    name:      name,
    key:       type + ":" + name,
    id:        undefined,

    sendMessage: function(msg){
      if(emitter){
          emitter(msg);
      }
    },

    decodeMessage: function(msg){
      var buf = msg;//convert.convertMessage(msg, this.type, "json");
      return buf;
    },
    
    encodeMessage: function(buf){
      var msg = buf;//convert.convertMessage(buf, "json", this.type)
      return msg;
    },

    simplify: function(){ return {type: type, name: this.name} },
  };
}
