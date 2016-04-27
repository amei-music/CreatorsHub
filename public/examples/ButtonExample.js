var examples = {
	click: function(){
		var log_btn = document.getElementById('log_btn');
		log_btn.value = 'Button Clicked';
		console.log('Button Example Clicked');
		gSocket.emit('message_json',{address: '/fm/noteon',args: [0,100,100]});
	}
}
