//音を出す準備
var ctx=new AudioContext();
var vco0, lfo, vcf;

vco0=ctx.createOscillator();
lfo=ctx.createOscillator();
vcf=ctx.createBiquadFilter();

vco0.connect(vcf);
lfo.connect(vco0.frequency);
lfo.connect(vcf.detune);
vcf.connect(ctx.destination);

//ハブに接続する
 var ioSocket = io.connect( "http://localhost:16080" );
 ioSocket.on( "connect", function() {
      console.log("connected");
      ioSocket.emit('join_as_wsjson', {name: 'webaudioapi_test'});
    });

//JSONメッセージを受ける
ioSocket.on("message_json", function(msg){
  var msgStr = msg["address"];
  var arg = msg["args"];//notenoをnoteon,noteoffに渡したい
  var pitch = noteNo2freq(arg[1]);

  if (msgStr == ("/fm/noteon")){
    setPitch(pitch)
    noteon();
  }else if (msgStr == ("/fm/noteoff")){
    setPitch(pitch)
    noteoff();
  }
});

//ノートナンバーを周波数に変換する
function noteNo2freq(noteno){
  return 440 * Math.pow(2,(noteno-69)/12)
}

//AudioContextに音高(周波数)を設定する
function setPitch (pitch){
  vco0.frequency.value=pitch;
}

/**
Play one sound
 */
function noteon(){
  vco0.start(0);
  lfo.start(0);
}

/**
Stop one sound
 */
function noteoff(){
    vco0.stop(0);
    lfo.stop(0);
    location.reload();
}
