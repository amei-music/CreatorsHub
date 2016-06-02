/**
 controlchangeイベントを送る
 */
function sendContrlChange() {
	var value = $( "#slider" ).slider( "value" );
	var log_sld = document.getElementById('log_sld');
	log_sld.value = 'Slider value = ' + value;
	gSocket.emit('message_json',{address: '/midi/controlchange',args: [0,11,value]});
}

/**
 jQueryでsliderを作る
 
 $()はjQuery()のエイリアス
 console.log($);
	function ( selector, context ) {
		// The jQuery object is actually just the init constructor 'enhanced'
		return new jQuery.fn.init( selector, context, rootjQuery );
	}
 */
jQuery(function() {
	$( "#slider" ).slider({
		orientation: "horizontal",
		max: 127,
		value: 0,
		slide: sendContrlChange,
		change: sendContrlChange,
		start: function() {
					var value = $( "#slider" ).slider( "value" );
					console.log('Slider Example Start = ' + value);
				},
		stop: function() {
					var value = $( "#slider" ).slider( "value" );
					console.log('Slider Example Stop = ' + value);
				}
	});
});
  