module.exports = {
  yamahaStyle: yamahaStyle,
  convertMessage: convertMessage,
}

// yamaha専用MIDIを試験的にパースしてみる
var yamahaStyle = {
  "/yamaha/style/sectioncontrol": [0xF0, 0x43, 0x7E, 0x00, 0xFF, 0xFF, 0xF7],
  "/yamaha/style/chordcontrol":   [0xF0, 0x43, 0x7E, 0x02, 0xFF, 0xFF, 0xFF, 0xFF, 0xF7],
}
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
      address: "/fm/noteon",
      args:    [ch, noteNum, velo]
    };

  } else if ( msg.length == 3 && ((msg[0] >> 4) == 9) && (msg[2] == 0) ){
    // note off with status 9
    var ch = (msg[0] & 0x0F), noteNum = msg[1], velo = 0x40;
    return {
      address: "/fm/noteoff",
      args:    [ch, noteNum, velo]
    };

  } else if ( msg.length == 3 && ((msg[0] >> 4) == 8) ){
    // note off with status 8
    var ch = (msg[0] & 0x0F), noteNum = msg[1], velo = msg[2];
    return {
      address: "/fm/noteoff",
      args:    [ch, noteNum, velo]
    };

  } else if ( msg.length == 3 && ((msg[0] >> 4) == 0xA) ){
    // polyphonic pressure
    var ch = (msg[0] & 0x0F), noteNum = msg[1], press = msg[2];
    return {
      address: "/fm/notepressure",
      args:    [ch, noteNum, press]
    };

  } else if ( msg.length == 3 && ((msg[0] >> 4) == 0xB) ){
    // control change
    var ch = (msg[0] & 0x0F), type = msg[1], value = msg[2];
    return {
      address: "/fm/controlchange",
      args:    [ch, type, value]
    };

  } else if ( msg.length == 2 && ((msg[0] >> 4) == 0xC) ){
    // program change
    var ch = (msg[0] & 0x0F), number = msg[1];
    return {
      address: "/fm/programchange",
      args:    [ch, number]
    };

  } else if ( msg.length == 2 && ((msg[0] >> 4) == 0xD) ){
    // channel pressure
    var ch = (msg[0] & 0x0F), value = msg[1];
    return {
      address: "/fm/channelpressure",
      args:    [ch, value]
    };

  } else if ( msg.length == 3 && ((msg[0] >> 4) == 0xE) ){
    // pitch bend
    var ch = (msg[0] & 0x0F), msb = msg[1], lsb = msg[2];
    return {
      address: "/fm/pitchbend",
      args:    [ch, msb, lsb]
    };

  } else if ( msg.length == 1 && msg[0] == 0xF8 ){
    // timing clock
    return {
      address: "/fm/timing",
      args:    []
    };

  } else if ( msg.length == 1 && msg[0] == 0xFA ){
    // start
    return {
      address: "/fm/start",
      args:    []
    };

  } else if ( msg.length == 1 && msg[0] == 0xFB ){
    // continue
    return {
      address: "/fm/continue",
      args:    []
    };

  } else if ( msg.length == 1 && msg[0] == 0xFC ){
    // stop
    return {
      address: "/fm/stop",
      args:    []
    };

  } else {
    // 追加挿入のtemplateにマッチするかチェック
    var obj = convertible(msg, yamahaStyle);
    if (obj != undefined){
      return obj;
    } else {
      // マッチしなければそのまま送信
      return {
        address: "/fm/midi_bytes",
        args:    msg
      };
    }
  }

}

function obj2midi(msg){
  if(msg.address == "/fm/noteon"){
    var ch = msg.args[0], noteNum = msg.args[1], velo = msg.args[2];
    if (ch < 16) return [0x90 + (ch & 0x0F), noteNum, velo];
    else         return [0x90 + (ch & 0x0F), noteNum, velo]; // 要対応
  } else if(msg.address == "/fm/noteoff"){
    var ch = msg.args[0], noteNum = msg.args[1], velo = msg.args[2];
    if (ch < 16) return [0x80 + (ch & 0x0F), noteNum, velo];
    else         return [0x80 + (ch & 0x0F), noteNum, velo]; // 要対応
  } else if (msg.args){
    // msg.argsがあれば、それを送信
    return msg.args
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

function convertMessage(msg, msg_from, msg_to){
  if(msg_from == msg_to) return msg; // そのまま

  if(msg_from == "json"){
    if(msg_to == "osc" ) return osc.toBuffer(msg);
    if(msg_to == "midi") return obj2midi(msg);
  }
  if(msg_from == "osc"){
    if(msg_to == "json") return osc.fromBuffer(msg); // 失敗するとthrow
    if(msg_to == "midi") return obj2midi(osc.fromBuffer(msg));
  }
  if(msg_from == "midi"){
    if(msg_to == "json") return midi2obj(msg); // OSCっぽいjsonなのでそのまま送信可
    if(msg_to == "osc" ) return osc.toBuffer(midi2obj(msg)); // 文字列にする
  }
}
