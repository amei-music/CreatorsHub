//==============================================================================
// JSONクライアント
//==============================================================================
var client_io = require('./client_io');
var host;

module.exports = {
  type: "json",
  createInput: ClientJson,
  createOutput: ClientJson,
  
  init: function(hostAPI){
    host = hostAPI;
  }
}

function ClientJson(name, emitter){
    var io = client_io(module.exports.type, name);
    io.socketId = undefined;
    io.sendMessage = function(msg){
      host.sendMessageTo(this.socketId, "message_json", msg);
    };
    return io;
}
