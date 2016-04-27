//==============================================================================
// converting MIDI messages <-> Object
//==============================================================================
module.exports = {
  midi2obj: midi2obj,
  obj2midi: obj2midi
}

//-----------------------------------------------
// create dictionary of MIDI messages from C style .h file
var dic = {};

var fs = require('fs');
var path = require('path');
var dir = path.dirname(module.filename);
var text = fs.readFileSync(dir + '/midimessage.h', 'utf8');
if(text){
  var src = text.split(/\r\n|\r|\n/); // split each line
  for(var i in src){
    var token = src[i].split(/\s+|\t+/); // split each token
    if(token.length >= 3){
      if(token[0] == "#define"){
        var key = token[1];
        var val = token[2].split('"'); // get string inside ""
        if(val.length >= 3){
          dic[key] = val[1];
        }
      }
    }
  }
}

//-----------------------------------------------

var prefix = function(path){ return dic._fm_prefix + path; }

// yamaha専用MIDIを試験的にパースしてみる
var yamahaStyle = {};
yamahaStyle[dic._yamaha_sectioncontrol] = [0xF0, 0x43, 0x7E, 0x00, 0xFF, 0xFF, 0xF7];
yamahaStyle[dic._yamaha_chordcontrol] = [0xF0, 0x43, 0x7E, 0x02, 0xFF, 0xFF, 0xFF, 0xFF, 0xF7];

function convertible(msg, dict){
  for (var key in dict){
    var midiTemplate = dict[key]
    if (midiTemplate.length != msg.length) continue;

    var args = [], i = 0; matches = true;
    while(matches && i < msg.length){
      if (midiTemplate[i] == 0xFF) args.push(msg[i]);
      else if (msg[i] != midiTemplate[i]) matches = false;
      i += 1;
    }
    if (matches) return {address: key, args: args};
  }

  return undefined
}

function midi2obj(msg){
  // ただのバイト列であるmidiをそれっぽいOSCに変換して返す

  if ( msg.length == 3 && ((msg[0] >> 4) == 9) && (msg[2] >  0) ){
    // note on
    var ch = (msg[0] & 0x0F), noteNum = msg[1], velo = msg[2];
    return {
      address: prefix(dic._fm_noteon),
      args:    [ch, noteNum, velo]
    };

  } else if ( msg.length == 3 && ((msg[0] >> 4) == 9) && (msg[2] == 0) ){
    // note off with status 9
    var ch = (msg[0] & 0x0F), noteNum = msg[1], velo = 0x40;
    return {
      address: prefix(dic._fm_noteoff),
      args:    [ch, noteNum, velo]
    };

  } else if ( msg.length == 3 && ((msg[0] >> 4) == 8) ){
    // note off with status 8
    var ch = (msg[0] & 0x0F), noteNum = msg[1], velo = msg[2];
    return {
      address: prefix(dic._fm_noteoff),
      args:    [ch, noteNum, velo]
    };

  } else if ( msg.length == 3 && ((msg[0] >> 4) == 0xA) ){
    // polyphonic pressure
    var ch = (msg[0] & 0x0F), noteNum = msg[1], press = msg[2];
    return {
      address: prefix(dic._fm_notepressure),
      args:    [ch, noteNum, press]
    };

  } else if ( msg.length == 3 && ((msg[0] >> 4) == 0xB) ){
    // control change
    var ch = (msg[0] & 0x0F), type = msg[1], value = msg[2];
    return {
      address: prefix(dic._fm_controlchange),
      args:    [ch, type, value]
    };

  } else if ( msg.length == 2 && ((msg[0] >> 4) == 0xC) ){
    // program change
    var ch = (msg[0] & 0x0F), number = msg[1];
    return {
      address: prefix(dic._fm_programchange),
      args:    [ch, number]
    };

  } else if ( msg.length == 2 && ((msg[0] >> 4) == 0xD) ){
    // channel pressure
    var ch = (msg[0] & 0x0F), value = msg[1];
    return {
      address: prefix(dic._fm_channelpressure),
      args:    [ch, value]
    };

  } else if ( msg.length == 3 && ((msg[0] >> 4) == 0xE) ){
    // pitch bend
    var ch = (msg[0] & 0x0F), msb = msg[1], lsb = msg[2];
    return {
      address: prefix(dic._fm_pitchbend),
      args:    [ch, msb, lsb]
    };

  } else if ( msg.length == 1 && msg[0] == 0xF8 ){
    // timing clock
    // console.log("timing");
    return {
      address: prefix(dic._fm_timing),
      args:    []
    };

  } else if ( msg.length == 1 && msg[0] == 0xFA ){
    // start
    // console.log("start");
    return {
      address: prefix(dic._fm_start),
      args:    []
    };

  } else if ( msg.length == 1 && msg[0] == 0xFB ){
    // continue
    return {
      address: prefix(dic._fm_continue),
      args:    []
    };

  } else if ( msg.length == 1 && msg[0] == 0xFC ){
    // stop
    // console.log("stop");
    return {
      address: prefix(dic._fm_stop),
      args:    []
    };

  } else {
    // 追加挿入のtemplateにマッチするかチェック
    var obj = convertible(msg, yamahaStyle);
    if (obj != undefined){
      // console.log(obj);
      return obj;
    } else {
      // マッチしなければそのまま送信
      return {
        address: prefix(dic._fm_midi_bytes),
        args:    msg
      };
    }
  }

}

function obj2midi(msg){
  if(msg.address == prefix(dic._fm_noteon)){
    var ch = msg.args[0], noteNum = msg.args[1], velo = msg.args[2];
    if (ch < 16) return [0x90 + (ch & 0x0F), noteNum, velo];
    else         return [0x90 + (ch & 0x0F), noteNum, velo]; // 要対応
  } else if(msg.address == prefix(dic._fm_noteoff)){
    var ch = msg.args[0], noteNum = msg.args[1], velo = msg.args[2];
    if (ch < 16) return [0x80 + (ch & 0x0F), noteNum, velo];
    else         return [0x80 + (ch & 0x0F), noteNum, velo]; // 要対応
  } else if(msg.address == prefix(dic._fm_notepressure)){
    var ch = msg.args[0], noteNum = msg.args[1], velo = msg.args[2];
    if (ch < 16) return [0xA0 + (ch & 0x0F), noteNum, velo];
    else         return [0xA0 + (ch & 0x0F), noteNum, velo]; // 要対応
  } else if(msg.address == prefix(dic._fm_controlchange)){
    var ch = msg.args[0], noteNum = msg.args[1], velo = msg.args[2];
    if (ch < 16) return [0xB0 + (ch & 0x0F), noteNum, velo];
    else         return [0xB0 + (ch & 0x0F), noteNum, velo]; // 要対応
  } else if(msg.address == prefix(dic._fm_programchange)){
    var ch = msg.args[0], noteNum = msg.args[1];
    if (ch < 16) return [0xC0 + (ch & 0x0F), noteNum];
    else         return [0xC0 + (ch & 0x0F), noteNum]; // 要対応
  } else if(msg.address == prefix(dic._fm_channelpressure)){
    var ch = msg.args[0], noteNum = msg.args[1];
    if (ch < 16) return [0xD0 + (ch & 0x0F), noteNum];
    else         return [0xD0 + (ch & 0x0F), noteNum]; // 要対応
  } else if(msg.address == prefix(dic._fm_pitchbend)){
    var ch = msg.args[0], noteNum = msg.args[1], velo = msg.args[2];
    if (ch < 16) return [0xE0 + (ch & 0x0F), noteNum, velo];
    else         return [0xE0 + (ch & 0x0F), noteNum, velo]; // 要対応

  } else if(msg.address == prefix(dic._fm_timing)){
    return [0xF8];

  } else if(msg.address == prefix(dic._fm_start)){
    return [0xFA];

  } else if(msg.address == prefix(dic._fm_continue)){
    return [0xFB];

  } else if(msg.address == prefix(dic._fm_stop)){
    return [0xFC];

  } else if(msg.address == prefix(dic._fm_sysex)){
    // sysexならargsにある配列をそのまま送信
    return msg.args;

  // } else if (msg.args){
  //   // msg.argsがあれば、それを送信
  //   return msg.args
  } else {
    // 特に形状が無ければ、stringifyしてそのままSysExにしてみる
    // 本当は8bit -> 7bit変換が必要だが、暫定対応でそのまま流してみる
    // このあたりを追求すればUSB-MIDIを「IPに依存しない汎用シリアル通信路」としてもうちょっと訴求できる気がする
    // 言い換えればUSB-MIDIにJSON流して現代的なプログラマも気軽に電子工作できる？
    var varlen = function(val){
      var size = 1;
      var tmp = val >> 7;
      while (tmp != 0){
        size += 1;
        tmp = tmp >> 7;
      }
      var ret = new Array(size);
      ret[size - 1] = val & 0x7F;
      for (var i=size-2; i>=0; --i){
        val = val >> 7;
        ret[i] = (val & 0x7F) | 0x80;
      }
      return ret;
    }

    var buf = JSON.stringify(msg);
    var ret = [0xF0, 0x7C] // 0x7D: 非営利, 0x7E: ノンリアルタイム, 0x7F: リアルタイムなので、0x7Cにしてみる
    var bytes = Array.prototype.map.call(buf, function(c){ return c.charCodeAt(0); });
    Array.prototype.push.apply(ret, varlen(buf.length));
    Array.prototype.push.apply(ret, bytes);
    Array.prototype.push.apply(ret, [0xF7]);
    return ret;
  }
}

function ClientMidi(name, emitter){
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
      var buf = midi2obj(msg);
      return buf;
    },
    
    encodeMessage: function(buf){
      var msg = obj2midi(buf);
      return msg;
    },

    simplify: function(){ return {type: type, name: this.name} }
  };
}
