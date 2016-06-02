//==============================================================================
// RTP MIDIクライアント
//==============================================================================
var client_io = require('./client_io');
var rtpmidi   = require('rtpmidi');
var midiconv  = require('./midiconverter');

var host;
var type = "rtp";

module.exports = {
  type: type,
  createInput: function(name){
    console.log("RtpMidi Input [" + name + "]");
    var input = createMidiInput(name);
    input.owner = "user";
    g_rtpSession.on('message', function(deltaTime, message) {
      var obj = Array.prototype.slice.call(message, 0);
      host.deliverMessage(this.id, message); // 配信
    }.bind(input));
    return input;
  },
  createOutput: function(name, emitter){
    console.log("RtpMidi Output [" + name + "]");
    var output = createMidiOutput(name, function(msg){
      g_rtpSession.sendMessage(0, msg);
    }.bind(output));
    output.owner = "user";
    return output;
  },

  init: function(hostAPI){
    host = hostAPI;
  },
}

// RtpMidi
var g_rtpSession = rtpmidi.manager.createSession({
  localName: 'Session 1',
  bonjourName: 'FM_MW1',
  port: 5008
});

function createMidiInput(name){
  var input = client_io(type, name);
  input.decodeMessage = function(msg){
    var buf = midiconv.midi2obj(msg);
    return buf;
  };
  return input;
}

function createMidiOutput(name, emitter){
  var output = client_io(type, name);
  output.sendMessage = function(msg){
    if(emitter){
        emitter(msg);
    }
  };
  output.encodeMessage = function(buf){
    var msg = midiconv.obj2midi(buf);
    return msg;
  };
  return(output);
}
