//==============================================================================
// 空のクライアント
//==============================================================================

var type = "sample";  // モジュールタイプ識別子（モジュールごとに一意な文字列）

module.exports = {
  type: type,
  createInput: ClientModule,
  createOutput: ClientModule,
  init: function(serverHost){
  }
}

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
  return {
    type:      type,
    name:      name,
    key:       type + ":" + name,
    id:        undefined,
    
    // 出力
    sendMessage: function(msg){
      // encodeMessageの出力がmsgとして渡される
      // そのままemitterに渡してよければこのままでよい
      if(emitter){
          emitter(msg);
      }
    },

    // デコード
    decodeMessage: function(msg){
      var buf = msg;
      /*
      // msgを以下のフォーマットに変換する
      buf = {
         address: "/foo/bar/", // OSCのaddressに相当する文字列
         args:    []           // OSCのargsに相当する配列
      }
      */
      return buf;
    },
    
     // エンコード
     encodeMessage: function(buf){
      var msg = buf;
      /*
      // bufをemitterで出力するフォーマットに変換する
      */
      return msg;
    },

    // typeと名前だけを取得
    simplify: function(){ return {type: type, name: this.name } },
  }
}
