//==============================================================================
// 空のクライアント
//==============================================================================

/* 
var client_io = require('./client_io');

// 入力を作成する場合
var type = "foo";  // タイプ
var name = "hoge"; // 表示用の名前・任意
var input = client_io(type, name);

// 出力を作成する場合
var output = client_io(type, name);
output.sendMessage = function(msg){
    // デバイスへの出力はここで行う
};
*/
module.exports = function(type, name){
  return {
    type:      type,
    name:      name,
    key:       type + ":" + name,
    id:        undefined,
    owner:     "system",
    
    // 入力
    listenMessage: function(){
      // 初期値は空のファンクション
    },
    
    // 出力
    sendMessage: function(msg){
      // 初期値は空のファンクション
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
      // bufをsendMessageで出力するフォーマットに変換する
      */
      return msg;
    },

    // typeと名前だけを取得
    simplify: function(){ return {type: this.type, name: this.name, owner: this.owner } },
  }
}
