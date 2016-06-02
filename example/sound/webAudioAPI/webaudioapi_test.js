var vco, lfo, vcf;
var AudioContext = window.AudioContext || window.webkitAudioContext;
var ctx=new AudioContext();
var isPlaying = false;

//connect to Hub
 var ioSocket = io.connect( "http://localhost:16080" );
 ioSocket.on( "connect", function() {
      console.log("connected");
      ioSocket.emit('join_as_wsjson', {name: 'webaudioapi_test'});
      prepareSound();
    });

//Receive Message
ioSocket.on("message_json", function(msg){
  var msgStr = msg["address"];
  var arg = msg["args"];
  var pitch = noteNo2freq(arg[1]);

  if (msgStr == ("/midi/noteon")){
    setPitch(pitch)
    noteon();
  }else if (msgStr == ("/midi/noteoff")){
    setPitch(pitch)
    noteoff();
  }
});

/**
Prepare for playing sound
*/
function prepareSound(){

  vco=ctx.createOscillator();
  lfo=ctx.createOscillator();
  vcf=ctx.createBiquadFilter();

  vco.connect(vcf);
  lfo.connect(vco.frequency);
  lfo.connect(vcf.detune);
  vcf.connect(ctx.destination);
}

/**
Translate MIDI notenumber to frequency
 */
function noteNo2freq(noteno){
  return 440 * Math.pow(2,(noteno-69)/12)
}

/**
Set frequency to AudioContext
 */
function setPitch (pitch){
  vco.frequency.value=pitch;
}

/**
Play one sound
 */
function noteon(){
  if(isPlaying == false){
    vco.start();
    lfo.start();
    isPlaying = true;
  }
}

/**
Stop one sound
 */
function noteoff(){
  if(isPlaying == true){
    vco.stop();
    lfo.stop();
    prepareSound();
    isPlaying = false;
  }
}
