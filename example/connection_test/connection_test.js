"use strict";

var ctrl = {
    socket: null,
    clients: {},

    test_json_name: "test json",

    sendPeriodic: false,
    numSent: 0,
    numReceived: 0,
	numModuleTest:0,
	moduleTestResult: [],

//-----------------------------------
// SPEAKSサーバーとの接続と初期化
//-----------------------------------

	init: function(){
        // サーバー接続
		this.socket = speaks.connect();

		// connect - サーバーとの接続通知
		this.socket.on("connect",      this.onConnect.bind(this));

		// disconnect - サーバーとの切断通知
		this.socket.on("disconnect",   this.onDisconnect.bind(this));

		// update_list - ポートの追加削除や接続の更新通知
		this.socket.on("update_list",  this.onUpdateList.bind(this));

		// message_json - JSONメッセージを受信
		this.socket.on("message_json", this.onMessageJson.bind(this));

		/* test_modules - SPEAKSモジュールの入出力テスト（使わない）
		this.socket.on("test_modules", this.onTestModules.bind(this));
		*/
        this.showstatus();
	},

//-----------------------------------
// SPEAKSサーバーからの接続状態通知
//-----------------------------------

	// サーバーとの接続通知
    onConnect : function(){
        console.log("onConnect");
        this.numSent = 0;
        this.numReceived = 0;

        // JSONポート接続
	    // this.join_as_wsjson();
    },

	// サーバーとの切断通知
    onDisconnect : function(){
        console.log("onDisconnect");
    },

//-----------------------------------
// SPEAKSサーバーとのJSONメッセージの送受信
//-----------------------------------

	// JSONポート作成
    join_as_wsjson: function(){
		console.log("join_as_wsjson");

		// name で指定した名前の入出力ポートを作成
		this.socket.emit("join_as_wsjson", { "name": this.test_json_name } );

		// ※ 次のような書き方も可能
	    // this.socket.emit("open_input", { type: "json", name: this.test_json_name} );
    	// this.socket.emit("open_output", { type: "json", name: this.test_json_name} );
   },

	// JSONポート削除
	exit_wsjson: function() {
		console.log("exit_wsjson");
	    this.socket.emit("exit_wsjson");

		// ※ 次のような書き方も可能
	    //this.socket.emit("close_input", { type: "json", name: this.test_json_name} );
    	//this.socket.emit("close_output", { type: "json", name: this.test_json_name} );
	},

	// JSONポートのOUTに出力されたメッセージを受信
    onMessageJson : function(obj){
		console.log("onMessageJson", obj);
    	// 受信カウントをインクリメント
        this.numReceived++;
    },

	// JSONポートのINにNoteOnメッセージを送信
   	sendNoteOnAsJSON: function(){
    	// note on を送ってみるテスト
		var test_json = {
			address: "/midi/noteon",
			args: [0,60, 127]
		};
		this.socket.emit("message_json", test_json);
		this.numSent++;
        
        if(this.sendPeriodic){
        	// sendPeriodic が true の場合は 125ms 毎に繰り返す
            setTimeout(this.sendNoteOnAsJSON.bind(this), 125);
        }
    },

	// 繰り返し送信を開始
    sendPeriodicStart: function(){
    	// sendPeriodic を true にして繰り返し送信
        this.sendPeriodic = true;
        this.sendNoteOnAsJSON();
    },

  	// 繰り返し送信を停止
    sendPeriodicStop: function(){
        this.sendPeriodic = false;
    },

//-----------------------------------
// SPEAKSサーバーの入出力ポート管理
//-----------------------------------

	// ポートの追加削除や接続の更新通知
    onUpdateList: function(obj){
		// obj: {
		//	 inputs: {
		//		接続ID0 : { type: "xxx", name: "xxx"},
		//		接続ID1 : { type: "xxx", name: "xxx"},
		//		   :
		//	 },
		//	 outputs: {
		//		接続ID0 : { type: "xxx", name: "xxx"},
		//		接続ID1 : { type: "xxx", name: "xxx"},
		//		   :
		//   }
		// }
		// 接続IDは各入出力ポートに割り当てられた任意のID
        console.log("onUpdateList", obj);
    	// クライアント情報を保存
    	this.clients = obj;
    },

	// SPEAKSサーバーの入出力ポートをまとめて削除
    removeUserClients: function(){
    	for(var i in this.clients.inputs){
    		var input = this.clients.inputs[i];
    		if(input.owner == "user"){
	    		this.socket.emit("close_input", input );
    		}
    	}
    	for(var i in this.clients.outputs){
    		var output = this.clients.outputs[i];
    		if(output.owner == "user"){
	    		this.socket.emit("close_output", output );
    		}
    	}
    },

	// SPEAKSサーバーに入出力ポートを作成（例）
    addUserClients: function(){
    	// osc入力の作成
		this.socket.emit("open_input", { type: "osc", name: "localhost:12345" });
    	// osc出力の作成
		this.socket.emit("open_output", { type: "osc", name: "localhost:12345" });
	   	// 仮想midi入力の作成
		this.socket.emit("open_input", { type: "midi", name: "test virtual midi" });
	   	// 仮想midi出力の作成
		this.socket.emit("open_output", { type: "midi", name: "test virtual midi" });
	   	// rtp-midi入力の作成
		this.socket.emit("open_input", { type: "rtp", name: "test rtp midi" });
	   	// rtp-midi出力の作成
		this.socket.emit("open_output", { type: "rtp", name: "test rtp midi" });
    },

	// 入出力ポート間の接続をすべて切る
    disconnectUserClients: function(){
    	for(var inputId in this.clients.inputs){
			for(var outputId in this.clients.outputs){
				var param = {inputId: inputId, outputId: outputId, connect: false}
				this.socket.emit("add_connection", param);
			}
    	}
    },

	// 入出力ポート間の接続を行う（例）
    connectUserClients: function(){
    	this.connectClients("json", this.test_json_name, "osc", "localhost:12345", true);
    	this.connectClients("json", this.test_json_name, "midi", "test virtual midi", true);
    	this.connectClients("json", this.test_json_name, "rtp", "test rtp midi", true);

    	this.connectClients("osc", "localhost:12345", "json", this.test_json_name, true);
    	this.connectClients("midi", "test virtual midi", "json", this.test_json_name, true);
    	this.connectClients("rtp", "test rtp midi", "json", this.test_json_name, true);

    	this.connectClients("osc", "localhost:12345", "analyzer", "Analyzer", true);
    },

	// 入出力ポート間の接続
	connectClients: function(inType, inName, outType, outName, connect){
		// inType: 入力ポートのモジュール識別子
		// inName: 入力ポートの名前
		// outType: 出力ポートのモジュール識別子
		// outName: 出力ポートの名前
		// connect: true 接続 ／ false 切断
		var param = {
			inputId: this.getClientId(this.clients.inputs, inType, inName),
			outputId: this.getClientId(this.clients.outputs, outType, outName),
			connect: connect
		};
		if(param.inputId === undefined || param.outputId === undefined){
			console.log("connectClients: port not found");
		}else{
			this.socket.emit("add_connection", param);
		}
	},

	// 入出力ポートのIDを取得
	getClientId: function(io, type, name){
		// io: onUpdateList の引数で渡された inputs または outputs
		// type と name から id を検索する
    	for(var id in io){
    		if(io[id].type == type && io[id].name == name){
    			return id;
    		}
    	}
    	return undefined;
	},
 
//-----------------------------------
// ステータス表示
//-----------------------------------

    showstatus: function(){
        var status = document.getElementById("status");
        status.innerHTML = (this.socket.connected ? "connected" : "disconnected")
                        + "<hr>"
                        + "Sent:" + this.numSent + "<br>"
                        + "Received:" + this.numReceived + "<br>";
		for(var i = 0; i < this.numModuleTest; i++){
			status.innerHTML +=	"ModuleTest["+ i + "]<br>"
						+ "<pre>" + this.moduleTestResult[i] + "</pre>";
		}
        setTimeout(this.showstatus.bind(this), 250);
    },
    
//-----------------------------------
// SPEAKSモジュールの入出力テスト（使わない）
//-----------------------------------
	/*
    test_modules: function(){
        var test_json = [
			{
				address: "/fm/noteon",
				args: [0,60, 127]
			},
			{
				address: "/foo/bar",
				args: { a: "string", b: 3.14, c: 1, d: true } // float値の精度に問題あり？
			}
		];

		this.numModuleTest = 0;
      	for(var j in this.test_json){
	        this.socket.emit("test_modules", this.test_json[j]);
    	}
	},
	*/
	/*
	onTestModules : function(msg){
		this.moduleTestResult[this.numModuleTest] = msg;
		this.numModuleTest++;
	}
	*/
}
