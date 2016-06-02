/**
 関数をメンバに持つDictionaryオブジェクト
 
 ボタンのクリックに対応させるように作成
 */
var examples = {
	click: function(){
		var log_btn = document.getElementById('log_btn');
		log_btn.value = 'Button Clicked';
		console.log('Button Example Clicked');
		gSocket.emit('message_json',{address: '/midi/noteon',args: [0,100,100]});
	}
}

/**
 ボタンのクリックに対応する関数　上と同じ
 */
function　click2(){
	var log_btn = document.getElementById('log_btn');
	log_btn.value = 'Button Clicked';
	console.log('Button Example Clicked');
	gSocket.emit('message_json',{address: '/midi/noteon',args: [0,100,100]});
}
