//==============================================================================
// JSONクライアント
//==============================================================================

module.exports = {
  create: ClientJson,
}

function ClientJson(name, emitter){
  var type = "json";
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
