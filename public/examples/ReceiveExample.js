gSocket.on("message_json", receiveMessage);

function receiveMessage(msg) {
	console.log(msg);
	var log_rcv = document.getElementById('log_rcv');
	log_rcv.value = msg.address + " : " + msg.args;
}
