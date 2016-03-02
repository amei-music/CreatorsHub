module.exports = {
  MidiDevices: MidiDevices,
}

var midi        = require('midi');

// ALSAがデフォルトで作るこれをopenPortすると即座にもう一個ポートが増えるらしく、無限増殖する
// ので、とりあえず名前で除外しておく(どうするのが正しい？)
var IGNORE_PATTERNS  = ["Midi Through", "RtMidi Output Client", "RtMidi Input Client"];
function foundInIngnoreList(name){
  for(var i=0; i<IGNORE_PATTERNS.length; ++i){
    if(name.indexOf(IGNORE_PATTERNS[i]) >= 0) return true;
  }
  return false;
}
function appendIngnoreList(name){
    if(IGNORE_PATTERNS.indexOf(name) < 0){
        IGNORE_PATTERNS.push(name);
    }
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

    vinputs : {}, // 仮想MIDI INオブジェクト
    voutputs: {}, // 仮想MIDI OUTオブジェクト

    onAddNewInput:  onAddNewInput,  // inputが新規追加されたときに呼ばれる(戻り値に受信ハンドラを返すこと)
    onDeleteInput:  onDeleteInput,  // inputが切断されたときに呼ばれる
    onAddNewOutput: onAddNewOutput, // outputが新規追加されたときに呼ばれる
    onDeleteOutput: onDeleteOutput, // outputが新規追加されたときに呼ばれる

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
    
    // 仮想MidiInを追加する
    createVirtualInput: function(name){
        // すでに同名の仮想MIDIINがある場合はnullを返す
        if(obj.vinputs[name]) return null;

        // 仮想MIDI INデバイスが出力側に出てこないようにする
        appendIngnoreList(name);

        var vin = new midi.input();
        vin.openVirtualPort(name);
        obj.vinputs[name] = vin;
        return vin;
    },

    // 仮想MidiOutを作成する
    createVirtualOutput: function(name){
        // すでに同名の仮想MIDIINがある場合はnullを返す
        if(obj.voutputs[name]) return null;
        
        // 仮想MIDI OUTデバイスが入力側に出てこないようにする
        appendIngnoreList(name);
        
        var vout = new midi.output();
        vout.openVirtualPort(name);
        obj.voutputs[name] = vout;
        return vout;
    },

    // 仮想MidiInを破棄する
   removeVirtualInput: function(name){
        if(obj.vinputs[name]){
            obj.vinputs[name].closePort();
            delete obj.vinputs[name];
        }
    },

    // 仮想MidiOutを破棄する
    removeVirtualOutput: function(name){
        if(obj.voutputs[name]){
            obj.voutputs[name].closePort();
            delete obj.voutputs[name];
        }
    },
  }

  // obj.input.closePort();  // なぜかこれをやっておかないとMacでsegmentation faultが起きる
  // obj.output.closePort(); // なぜかこれをやっておかないとMacでsegmentation faultが起きる

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
