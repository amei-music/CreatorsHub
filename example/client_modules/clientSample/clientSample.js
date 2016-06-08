//==============================================================================
// a empty SPEAKS module
//==============================================================================

var type = "sample";  // module type identifier

module.exports = {
  type: type,
  createInput: ClientModule,
  createOutput: ClientModule,
  init: function(hostAPI){
    var input = ClientModule("null input");
    hostAPI.addInput(input);
    var output = ClientModule("null output");
    hostAPI.addOutput(output);
  }
}

var client_io   = require('./client_io');
function ClientModule(name){
  var io = client_io(type, name);
  return io;
}
