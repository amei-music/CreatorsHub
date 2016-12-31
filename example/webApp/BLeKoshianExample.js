// 2016.12/18
// This example to use Koshian with Bluetooth LE
// Koshian is a compatible module of Konashi
// Datas form GPIO of Koshian via BLE to Creators' Hub via Websocket 
// http://konashi.ux-xu.com/documents/
// http://www.m-pression.com/ja/solutions/boards/koshian
// You need install following two modules
// > npm install noble
// > npm install socket.io-client
// Special Thanks for http://www.1ft-seabass.jp/memo/2015/12/17/nodejs-noble-konashi-connect/
//

var noble = require('noble');

// ----------------------------------------------------------------------------
// To connect Bluetooth LE
//
// Koshian自体のサービスID
var KOSHIAN_SERVICE_UUID 					= '229bff0003fb40da98a7b0def65c2d4b';

// 操作したいpinのID
var KOSHIAN_PIO_SETTING_PINID    			= '229b300003fb40da98a7b0def65c2d4b';
var KOSHIAN_PIO_PULLUP_PINID     			= '229b300103fb40da98a7b0def65c2d4b'
var KOSHIAN_PIO_OUTPUT_PINID     			= '229b300203fb40da98a7b0def65c2d4b';
var KOSHIAN_PIO_INPUT_NORTIFICATION_PINID	= '229b300303fb40da98a7b0def65c2d4b';

var KOSHIAN_PWM_CONFIG_PINID				= '229b300403fb40da98a7b0def65c2d4b';
var KOSHIAN_PWM_PARAMETER_PINID				= '229b300503fb40da98a7b0def65c2d4b';
var KOSHIAN_PWM_DUTY_PINID					= '229b300603fb40da98a7b0def65c2d4b';

var KOSHIAN_ANALOG_DRIVE_PINID   			= '229b300703fb40da98a7b0def65c2d4b';
var KOSHIAN_ANALOG_READ0_PINID   			= '229b300803fb40da98a7b0def65c2d4b';
var KOSHIAN_ANALOG_READ1_PINID   			= '229b300903fb40da98a7b0def65c2d4b';
var KOSHIAN_ANALOG_READ2_PINID   			= '229b300a03fb40da98a7b0def65c2d4b';

// 各CHARACTERISTICSをUUIDから判断してcharacteristic格納する変数
var KOSHIAN_CHARACTERISTICS_ANALOG_READ0;
var KOSHIAN_CHARACTERISTICS_ANALOG_READ1;
var KOSHIAN_CHARACTERISTICS_ANALOG_READ2;

var KOSHIAN_CHARACTERISTICS_PIO_SETTINGS;
var KOSHIAN_CHARACTERISTICS_PIO_OUTPUT;
var KOSHIAN_CHARACTERISTICS_PIO_INPUT;

// スイッチ、アナログバリューのバッファー
var mPIO_0=0;
var mPIO_1=0;
var mAGO=0;
var mAG1=0;
var mAG2=0;
var mVch=0;

// LED ON/OFF
var led_toggle = false;
 
// 状態がパワーONだったらスキャンに移行
noble.on('stateChange', function(state) {
	console.log('on -> stateChange: ' + state);
 
	if (state === 'poweredOn') {
		noble.startScanning();
	} else {
		noble.stopScanning();
    }
});
 
noble.on('scanStart', function() {
	console.log('on -> scanStart');
});
 
noble.on('scanStop', function() {
	console.log('on -> scanStop');
});
 
// discover 機器が発見されたら
noble.on('discover', function(peripheral) {
	console.log('on -> discover: ' + peripheral);
    // まずスキャンをとめる
	noble.stopScanning();
 
	// KOSHIAN接続時のイベント
	peripheral.on('connect', function() {
		console.log('on -> connect');
		this.discoverServices();
	});
	// KOSHIAN切断時のイベント
	peripheral.on('disconnect', function() {
		console.log('on -> disconnect');
	});
 
	// 見つけたサービス（機器）へのアクセス
	peripheral.on('servicesDiscover', function(services) {
 
		console.log('on -> services length ' + services.length);

		for(i = 0; i < services.length; i++) {
 
			// サービスがKOSHIAN_SERVICE_UUIDと一致した時だけ処理
			if(services[i]['uuid'] == KOSHIAN_SERVICE_UUID){
				console.log('on -> find KOSHIAN ' + i);
 
				// サービスのcharacteristic捜索
				services[i].on('includedServicesDiscover', function(includedServiceUuids) {
				console.log('on -> service included services discovered [' + includedServiceUuids + ']');
				this.discoverCharacteristics();
			});
 
			// characteristic取得イベント
			services[i].on('characteristicsDiscover', function(characteristics) {
 
				// characteristics配列から必要なCHARACTERISTICSをUUIDから判断してcharacteristic格納
				for(j = 0; j < characteristics.length; j++) {
					// アナログ入力 characteristic
					if( KOSHIAN_ANALOG_READ0_PINID == characteristics[j].uuid ){
						console.log("KOSHIAN_CHARACTERISTICS_ANALOG_READ exist!!");
						KOSHIAN_CHARACTERISTICS_ANALOG_READ0 = characteristics[j];
					}
					if( KOSHIAN_ANALOG_READ1_PINID == characteristics[j].uuid ){
						console.log("KOSHIAN_CHARACTERISTICS_ANALOG_READ exist!!");
						KOSHIAN_CHARACTERISTICS_ANALOG_READ1 = characteristics[j];
					}
					
					if( KOSHIAN_ANALOG_READ2_PINID == characteristics[j].uuid ){
						console.log("KOSHIAN_CHARACTERISTICS_ANALOG_READ exist!!");
						KOSHIAN_CHARACTERISTICS_ANALOG_READ2 = characteristics[j];
 					}

						// PIO設定 characteristic
					if( KOSHIAN_PIO_SETTING_PINID == characteristics[j].uuid ){
						console.log("KOSHIAN_PIO_SETTING_PINID exist!!");
						KOSHIAN_CHARACTERISTICS_PIO_SETTINGS = characteristics[j];
						// PIO0, PIO1 を入力、その他を出力に設定
						KOSHIAN_CHARACTERISTICS_PIO_SETTINGS.write(new Buffer([0b11111100]), true);
					}

                        // デジタル出力 characteristic
					if( KOSHIAN_PIO_OUTPUT_PINID == characteristics[j].uuid ){
						console.log("KOSHIAN_PIO_OUTPUT_PINID exist!!");
						KOSHIAN_CHARACTERISTICS_PIO_OUTPUT = characteristics[j];
					}

						// デジタル入力  characteristic
					if( KOSHIAN_PIO_INPUT_NORTIFICATION_PINID == characteristics[j].uuid ){
						 console.log("KOSHIAN_PIO_INPUT_PINID exist!!");
						KOSHIAN_CHARACTERISTICS_PIO_INPUT = characteristics[j];
					}
				}
 
				setInterval(function(){
					// 実際の点滅
					// DEGITAL OUTPUT PIO5
					if(led_toggle){
						// LED ON console.log("LED ON");
						KOSHIAN_CHARACTERISTICS_PIO_OUTPUT.write(new Buffer([0b00100000]), true);
					} else {
						// LED OFF console.log("LED OFF");
						KOSHIAN_CHARACTERISTICS_PIO_OUTPUT.write(new Buffer([0b00000000]), true);
					}
					 // LED ON/OFFの反転
					led_toggle = !led_toggle;
				}, 1000);

				// スイッチ、ボリュームの読み込み
				setInterval(function(){
					// SWITCH_READ
					KOSHIAN_CHARACTERISTICS_PIO_INPUT.read(function(error, data) {
						if (data) {
							if((data[0]&0x01)!= mPIO_0){
								mPIO_0 = data[0]&0x01;
								console.log( 'switch:' + mPIO_0);
								if( mPIO_0 ) sendContrlChange(0x00,0x10,0x7F);
								else  sendContrlChange(0x00,0x10,0x00);
							}
							if((data[0]&0x02)!= mPIO_1){
								mPIO_1 = data[0]&0x02;
                               	console.log( 'switch:' + mPIO_1);
								if( mPIO_1 ) sendContrlChange(0x00,0x20,mVch);
								mVch++;
								mVch&=0x7;
							}
						}
					});

					// ANALOG_READ
					var mMaxAGO=0x7F;		//ボリュームをＭＩＤＩに変換する際に最大
					var mMaxAG1=0x40;		//ボリュームをＭＩＤＩに変換する際に最大

					KOSHIAN_CHARACTERISTICS_ANALOG_READ0.read(function(error, data) {
						if (data) {
							var temp = Math.floor((data[1] + data[0]*256)/2500*mMaxAGO);
							if(temp>mMaxAGO) temp=mMaxAGO;
							if(mAGO != temp ){
								mAGO = temp;
								sendContrlChange(0x01,0x10,mAGO);	//send Control Change via WebSocket
								console.log( 'value0:' + mAGO );
							}
						}
					});

					KOSHIAN_CHARACTERISTICS_ANALOG_READ1.read(function(error, data) {
						if (data) {
							var temp = Math.floor((data[1] + data[0]*256)/2500*mMaxAG1);
							if(temp>mMaxAG1) temp=mMaxAG1;
							if(mAG1 != temp ){
								mAG1 = temp;
								sendContrlChange(0x01,0x11,mAG1);	//send Control Change via WebSocket
								console.log( 'value1:' + mAG1 );
								}
							}
						});

					}, 40);

				});

				services[i].discoverIncludedServices();
			}
		}
 	});
 
    // 機器との接続開始
	peripheral.connect();
});


var vv=0;
// ----------------------------------------------------------------------------
// To connect Creators' Hub via Websocket\
var client = require('socket.io-client');
var socket = client.connect('http://localhost:16080');

<!-- 接続が確立した時のイベントハンドラ -->
socket.on( "connect", function() {
	console.log("connected");
	socket.emit('join_as_wsjson', {name: 'Koshian'});
});

<!-- 切断された時のイベントハンドラ -->
socket.on( "disconnect", function() {
	console.log("disconnected");
});

function sendContrlChange(ch, cnum, value) {
	socket.emit('message_json',{address: '/midi/controlchange',args: [ch,cnum,value]});
}

/*
setInterval(function(){
	sendContrlChange(0x05,0x90,0x01); vv++;
}, 1000 );
*/
