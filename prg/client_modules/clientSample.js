//==============================================================================
// 空のクライアント
//==============================================================================

var type = "sample";  // モジュールタイプ識別子（モジュールごとに一意な文字列）

module.exports = {
  type: type,
  createInput: ClientModule,
  createOutput: ClientModule,
  init: function(hostAPI){
  }
}

var client_io   = require('./client_io');

/* 
var clientSample = require('./clientSample');

// 入力を作成する場合(emitterは使わない)
var name = "hoge"; // 表示用の名前・任意
var input = clientSample.create(name);

// 出力を作成する場合
var emitter = function(msg){
    // emitterはsendMessageからコールバックされる
    // デバイスへの出力はここで行う
};
var output = clientSample.create(name, emitter);
*/
function ClientModule(name, emitter){
  var io = client_io(type, name);
  return io;
}
