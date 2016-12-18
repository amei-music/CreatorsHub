// 2016.12/18
// This example to use Konashi with Bluetooth LE
// Datas form GPIO of Konashi via BLE to Creators' Hub via Websocket 
// http://konashi.ux-xu.com/documents/
// You need install following two modules
// npm install noble
// npm install socket.io-client
// Special Thanks for http://www.1ft-seabass.jp/memo/2015/12/17/nodejs-noble-konashi-connect/
//

var noble = require('noble');

// ----------------------------------------------------------------------------
// To connect Bluetooth LE
//
// KONASHI���̂̃T�[�r�XID
var KONASHI_SERVICE_UUID = '229bff0003fb40da98a7b0def65c2d4b';

// ���삵����pin��ID
var KONASHI_PIO_SETTING_PINID    			= '229b300003fb40da98a7b0def65c2d4b';
var KONASHI_PIO_PULLUP_PINID     			= '229b300103fb40da98a7b0def65c2d4b'
var KONASHI_PIO_OUTPUT_PINID     			= '229b300203fb40da98a7b0def65c2d4b';
var KONASHI_PIO_INPUT_NORTIFICATION_PINID	= '229b300303fb40da98a7b0def65c2d4b';

var KONASHI_PWM_CONFIG_PINID				= '229b300403fb40da98a7b0def65c2d4b';
var KONASHI_PWM_PARAMETER_PINID				= '229b300503fb40da98a7b0def65c2d4b';
var KONASHI_PWM_DUTY_PINID					= '229b300603fb40da98a7b0def65c2d4b';

var KONASHI_ANALOG_DRIVE_PINID   			= '229b300703fb40da98a7b0def65c2d4b';
var KONASHI_ANALOG_READ0_PINID   			= '229b300803fb40da98a7b0def65c2d4b';
var KONASHI_ANALOG_READ1_PINID   			= '229b300903fb40da98a7b0def65c2d4b';
var KONASHI_ANALOG_READ2_PINID   			= '229b300a03fb40da98a7b0def65c2d4b';

// �eCHARACTERISTICS��UUID���画�f����characteristic�i�[����ϐ�
var KONASHI_CHARACTERISTICS_ANALOG_READ0;
var KONASHI_CHARACTERISTICS_ANALOG_READ1;
var KONASHI_CHARACTERISTICS_ANALOG_READ2;

var KONASHI_CHARACTERISTICS_PIO_SETTINGS;
var KONASHI_CHARACTERISTICS_PIO_OUTPUT;
var KONASHI_CHARACTERISTICS_PIO_INPUT;

// �X�C�b�`�A�A�i���O�o�����[�̃o�b�t�@�[
var mPIO_0=0;
var mPIO_1=0;
var mAGO=0;
var mAG1=0;
var mAG2=0;
var mVch=0;

// LED ON/OFF
var led_toggle = false;
 
// ��Ԃ��p���[ON��������X�L�����Ɉڍs
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
 
// discover �@�킪�������ꂽ��
noble.on('discover', function(peripheral) {
	console.log('on -> discover: ' + peripheral);
    // �܂��X�L�������Ƃ߂�
	noble.stopScanning();
 
	// KONASHI�ڑ����̃C�x���g
	peripheral.on('connect', function() {
		console.log('on -> connect');
		this.discoverServices();
	});
	// KONASHI�ؒf���̃C�x���g
	peripheral.on('disconnect', function() {
		console.log('on -> disconnect');
	});
 
	// �������T�[�r�X�i�@��j�ւ̃A�N�Z�X
	peripheral.on('servicesDiscover', function(services) {
 
		console.log('on -> services length ' + services.length);

		for(i = 0; i < services.length; i++) {
 
			// �T�[�r�X��KONASHI_SERVICE_UUID�ƈ�v��������������
			if(services[i]['uuid'] == KONASHI_SERVICE_UUID){
				console.log('on -> find KONASHI ' + i);
 
				// �T�[�r�X��characteristic�{��
				services[i].on('includedServicesDiscover', function(includedServiceUuids) {
				console.log('on -> service included services discovered [' + includedServiceUuids + ']');
				this.discoverCharacteristics();
			});
 
			// characteristic�擾�C�x���g
			services[i].on('characteristicsDiscover', function(characteristics) {
 
				// characteristics�z�񂩂�K�v��CHARACTERISTICS��UUID���画�f����characteristic�i�[
				for(j = 0; j < characteristics.length; j++) {
					// �A�i���O���� characteristic
					if( KONASHI_ANALOG_READ0_PINID == characteristics[j].uuid ){
						console.log("KONASHI_CHARACTERISTICS_ANALOG_READ exist!!");
						KONASHI_CHARACTERISTICS_ANALOG_READ0 = characteristics[j];
					}
					if( KONASHI_ANALOG_READ1_PINID == characteristics[j].uuid ){
						console.log("KONASHI_CHARACTERISTICS_ANALOG_READ exist!!");
						KONASHI_CHARACTERISTICS_ANALOG_READ1 = characteristics[j];
					}
					
					if( KONASHI_ANALOG_READ2_PINID == characteristics[j].uuid ){
						console.log("KONASHI_CHARACTERISTICS_ANALOG_READ exist!!");
						KONASHI_CHARACTERISTICS_ANALOG_READ2 = characteristics[j];
 					}

						// PIO�ݒ� characteristic
					if( KONASHI_PIO_SETTING_PINID == characteristics[j].uuid ){
						console.log("KONASHI_PIO_SETTING_PINID exist!!");
						KONASHI_CHARACTERISTICS_PIO_SETTINGS = characteristics[j];
						// PIO0, PIO1 ����́A���̑����o�͂ɐݒ�
						KONASHI_CHARACTERISTICS_PIO_SETTINGS.write(new Buffer([0b11111100]), true);
					}

                        // �f�W�^���o�� characteristic
					if( KONASHI_PIO_OUTPUT_PINID == characteristics[j].uuid ){
						console.log("KONASHI_PIO_OUTPUT_PINID exist!!");
						KONASHI_CHARACTERISTICS_PIO_OUTPUT = characteristics[j];
					}

						// �f�W�^������  characteristic
					if( KONASHI_PIO_INPUT_NORTIFICATION_PINID == characteristics[j].uuid ){
						 console.log("KONASHI_PIO_INPUT_PINID exist!!");
						KONASHI_CHARACTERISTICS_PIO_INPUT = characteristics[j];
					}
				}
 
				setInterval(function(){
					// ���ۂ̓_��
					// DEGITAL OUTPUT PIO5
					if(led_toggle){
						// LED ON console.log("LED ON");
						KONASHI_CHARACTERISTICS_PIO_OUTPUT.write(new Buffer([0b00100000]), true);
					} else {
						// LED OFF console.log("LED OFF");
						KONASHI_CHARACTERISTICS_PIO_OUTPUT.write(new Buffer([0b00000000]), true);
					}
					 // LED ON/OFF�̔��]
					led_toggle = !led_toggle;
				}, 1000);

				// �X�C�b�`�A�{�����[���̓ǂݍ���
				setInterval(function(){
					// SWITCH_READ
					KONASHI_CHARACTERISTICS_PIO_INPUT.read(function(error, data) {
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
					var mMaxAGO=0x7F;		//�{�����[�����l�h�c�h�ɕϊ�����ۂɍő�
					var mMaxAG1=0x40;		//�{�����[�����l�h�c�h�ɕϊ�����ۂɍő�

					KONASHI_CHARACTERISTICS_ANALOG_READ0.read(function(error, data) {
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

					KONASHI_CHARACTERISTICS_ANALOG_READ1.read(function(error, data) {
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
 
    // �@��Ƃ̐ڑ��J�n
	peripheral.connect();
});


var vv=0;
// ----------------------------------------------------------------------------
// To connect Creators' Hub via Websocket\
var client = require('socket.io-client');
var socket = client.connect('http://localhost:16080');

<!-- �ڑ����m���������̃C�x���g�n���h�� -->
socket.on( "connect", function() {
	console.log("connected");
	socket.emit('join_as_wsjson', {name: 'Koshian'});
});

<!-- �ؒf���ꂽ���̃C�x���g�n���h�� -->
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
