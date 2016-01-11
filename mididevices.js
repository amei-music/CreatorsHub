module.exports = {
  MidiDevices: MidiDevices,
}

var midi        = require('midi');
var rtpmidi     = require('rtpmidi');

// ALSAがデフォルトで作るこれをopenPortすると即座にもう一個ポートが増えるらしく、無限増殖する
// ので、とりあえず名前で除外しておく(どうするのが正しい？)
var IGNORE_PATTERNS  = ["Midi Through", "RtMidi Output Client", "RtMidi Input Client"];
function foundInIngnoreList(name){
  for(var i=0; i<IGNORE_PATTERNS.length; ++i){
    if(name.indexOf(IGNORE_PATTERNS[i]) >= 0) return true;
  }
  return false;
}

//==============================================================================
// MIDIデバイスの増減をcallback式で通知してくれる人
//
// rtMidiだとport番号は見つかったものから連番になるだけなので、ユニークIDにはならない
// とりあえずの安全策として名前の方をユニークIDとしてdictのkeyにする
//==============================================================================
function MidiDevices(onAddNewInput, onDeleteInput, onAddNewOutput, onDeleteOutput){
  var obj = {
    input:  new midi.input(),  // port一覧を出すためのglobalな(openPortしない)inputを一つ用意しておく
    output: new midi.output(), // port一覧を出すためのglobalな(openPortしない)outputを一つ用意しておく

    inputs : {}, // 開いたportにつながっているmidiオブジェクト
    outputs: {}, // 開いたportにつながっているmidiオブジェクト

    onAddNewInput:  onAddNewInput,  // inputが新規追加されたときに呼ばれる(戻り値に受信ハンドラを返すこと)
    onDeleteInput:  onDeleteInput,  // inputが切断されたときに呼ばれる
    onAddNewOutput: onAddNewOutput, // outputが新規追加されたときに呼ばれる
    onDeleteOutput: onDeleteOutput, // outputが新規追加されたときに呼ばれる

    session: rtpmidi.manager.createSession({
      localName: 'Session 1',
      bonjourName: 'FM_MW1',
      port: 5008
    }),

    // input deviceを監視して、新規追加、削除があれば上流に通知する
    updateInputDevices: function(){
      var existingInputs = {}; for(var name in this.inputs) existingInputs[name] = false;

      for(var portNum=0; portNum<this.input.getPortCount(); ++portNum){
        var name = this.input.getPortName(portNum);
        if (foundInIngnoreList(name)) continue;

        if (! (name in this.inputs)){ // 新たに見つかったMIDI IN
          var midiIn   = new midi.input();
          var callback = this.onAddNewInput(midiIn, name) // 上流にイベント通知 + 受信ハンドラを作ってもらう

          midiIn.openPort(portNum); // 実際に開いておく
          midiIn.ignoreTypes(false, false, true); // (Sysex, Timing, Active Sensing) のignoreを設定する
          midiIn.on('message', callback);
          this.inputs[name] = midiIn

        } else {
          existingInputs[name] = true; // 存続しているMIDI IN
        }
      }

      for (name in existingInputs){
        if (existingInputs[name] == false){ // いなくなったMIDI IN
          this.onDeleteInput(this.inputs[name], name);
          this.inputs[name].closePort();
          delete this.inputs[name];
        }
      }
    },

    // output deviceを監視して、新規追加、削除があれば上流に通知する
    updateOutputDevices : function(){
      var existingOutputs = {}; for(var name in this.outputs) existingOutputs[name] = false;

      for(var portNum=0; portNum<this.output.getPortCount(); ++portNum){
        var name = this.output.getPortName(portNum);
        if (foundInIngnoreList(name)) continue;

        if (! (name in this.outputs)){ // 新たに見つかったMIDI OUT
          var midiOut   = new midi.output();
          this.onAddNewOutput(midiOut, name); // 上流にイベント通知

          midiOut.openPort(portNum); // 実際に開いておく
          this.outputs[name] = midiOut;

        } else {
          existingOutputs[name] = true;
        }
      }

      for (name in existingOutputs){
        if (existingOutputs[name] == false){ // いなくなったMIDI OUT
          this.onDeleteOutput(this.outputs[name], name);
          this.outputs[name].closePort();
          delete this.outputs[name];
        }
      }

    },

    updateDevices : function(){
      this.updateInputDevices();
      this.updateOutputDevices();
    },

    // 単にデバイス一覧を表示する
    showDevices: function(){
      for(var portNum=0; portNum<this.input.getPortCount(); ++portNum){
        console.log("input", portNum, this.input.getPortName(portNum));
      }

      for(var portNum=0; portNum<this.output.getPortCount(); ++portNum){
        console.log("output", portNum, this.output.getPortName(portNum))
      }
    },
  }

  // obj.input.closePort();  // なぜかこれをやっておかないとMacでsegmentation faultが起きる
  // obj.output.closePort(); // なぜかこれをやっておかないとMacでsegmentation faultが起きる

  // Create the virtual midi ports
  var virtualPortName = obj.session.bonjourName + ":" + obj.session.port;
  obj.input.openVirtualPort(virtualPortName);
  obj.output.openVirtualPort(virtualPortName);

  // Route the messages
  obj.session.on('message', function(deltaTime, message) {
  // message is a Buffer so we convert it to an array to pass it to the midi output.
    var commands = Array.prototype.slice.call(message, 0);
    //console.log('received a network message', commands);
    obj.output.sendMessage(commands);
  });
    
  obj.input.on('message', function(deltaTime, message) {
    //console.log('received a local message', message);
    obj.session.sendMessage(deltaTime, message);
  });
  
  // Connect to a remote session
  //obj.session.connect({ address: '127.0.0.1', port: 5004 });
  //obj.session.connect({ address: '192.168.1.12', port: 5004 });

  setInterval(obj.updateDevices.bind(obj), 500);

  return obj;
}


//==============================================================================
// test code
//==============================================================================
if (require.main === module) {
  function onAddNewMidiInput(midiInObj, name){
    console.log("Input device added: ", name);

    return function(deltaTime, message) {
      console.log("input from [" + name + "]", {'msg': message, 'delta': deltaTime});
    };
  }

  function onDeleteMidiInput(midiInObj, name){
    console.log("Input device removed: ", name);
  }

  function onAddNewMidiOutput(midiOutObj, name){
    console.log("Output device added: ", name);
  }

  function onDeleteMidiOutput(midiOutObj, name){
    console.log("Output device removed: ", name);
  }

  // midiのコネクションを作成
  var g_midiObj = MidiDevices(onAddNewMidiInput, onDeleteMidiInput, onAddNewMidiOutput, onDeleteMidiOutput);

}
