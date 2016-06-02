//Prepare for playing sound
var ctx=new AudioContext();
var vco, lfo, vcf;

vco=ctx.createOscillator();
lfo=ctx.createOscillator();
vcf=ctx.createBiquadFilter();

vco.connect(vcf);
lfo.connect(vco.frequency);
lfo.connect(vcf.detune);
vcf.connect(ctx.destination);

//connect to Hub
 var ioSocket = io.connect( "http://localhost:16080" );
 ioSocket.on( "connect", function() {
      console.log("connected");
      ioSocket.emit('join_as_wsjson', {name: 'webaudioapi_test'});
    });

//Receive Message
ioSocket.on("message_json", function(msg){
  var msgStr = msg["address"];
  var arg = msg["args"];
  var pitch = noteNo2freq(arg[1]);

  if (msgStr == ("/fm/noteon")){
    setPitch(pitch)
    noteon();
  }else if (msgStr == ("/fm/noteoff")){
    setPitch(pitch)
    noteoff();
  }
});

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
  vco.start(0);
  lfo.start(0);
}

/**
Stop one sound
 */
function noteoff(){
    vco.stop(0);
    lfo.stop(0);
    location.reload();
}
