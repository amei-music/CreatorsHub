/**
 グローバルなsocket.ioのソケットオブジェクトに対してイベントハンドラを設定する。

 'message_json' : 対応するイベント
 receiveMessage : ハンドラ　function
 */
gSocket.on('message_json', receiveMessage);

/**
 'message_json'に対応するハンドラ

 msg : 'message_json'イベントが呼び出された時の第1引数
 
 引数の数は呼び出し時に決まる。
 */
function receiveMessage(msg) {
	console.log(msg);
	var log_rcv = document.getElementById('log_rcv');
	log_rcv.value = msg.address + " : " + msg.args;
}
