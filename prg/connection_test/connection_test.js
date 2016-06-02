"use strict";

var ctrl = {
    socket: null,
    clients: {},
	param: {
        // 引数と初期値
        // http://foo/bar.html?url=ws://192.168.1.29:16080&
        url: "ws://localhost:16080", // 接続先
        count: 1 // "送信"１回に送るイベント数
    },
    name: "test json",
    sendPeriodic: false,
    numSent: 0,
    numReceived: 0,
	numModuleTest:0,
	moduleTestResult: [],
    test_json: [
		{
			address: "/midi/noteon",
			args: [0,60, 127]
		},
		{
			address: "/foo/bar",
			args: { a: "string", /*b: 3.14,*/ c: 1, d: true } // float値の精度に問題あり？
		}
	],

	init: function(){
        // 引数取得
        if(window.location.search.length > 1){
            let query = window.location.search.substring(1);
            let args = query.split('&');
            for(let arg of args){
                let p = arg.split('=');
                this.param[p[0]] = p[1];
            }
        }
        console.log(this.param);

        // 接続
		this.socket = io.connect(this.param.url);
		this.socket.on("update_list",  this.onUpdateList.bind(this));
		this.socket.on("message_json", this.onMessageJson.bind(this));
		this.socket.on("test_modules", this.onTestModules.bind(this));
		this.socket.on("connect", this.onConnect.bind(this));
		this.socket.on("disconnect",   this.onDisconnect.bind(this));
        this.showstatus();
	},
    
    onUpdateList: function(obj){
    	this.clients = obj;
        //var table = makeConnectionTable(obj, this.add_connection.bind(this), this.close_osc_input.bind(this), this.close_osc_output.bind(this));
        console.log("onUpdateList", obj);
    },

    onMessageJson : function(obj){
    	var bad_addr = true;
      	for(var j in this.test_json){
			if(obj.address == this.test_json[j].address){
				bad_addr = false;
				for(var i in obj.args){
					if(obj.args[i] != this.test_json[j].args[i]){
						console.log("BAD args");
					}
				}
			}
      	}
      	if(bad_addr){
			console.log("BAD address");
      	}
        this.numReceived++;
    },

    onConnect : function(){
        console.log("onConnect");
        this.numSent = 0;
        this.numReceived = 0;
	    this.join();
    },

    onDisconnect : function(){
        console.log("onDisconnect");
    },

    join: function(){
		this.socket.emit("join_as_wsjson", { "name": this.name } );
    },

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

    addUserClients: function(){
		this.socket.emit("open_input", { type: "osc", name: "localhost:12345" });
		this.socket.emit("open_output", { type: "osc", name: "localhost:12345" });
		this.socket.emit("open_input", { type: "midi", name: "test virtual midi" });
		this.socket.emit("open_output", { type: "midi", name: "test virtual midi" });
		this.socket.emit("open_input", { type: "rtp", name: "test rtp midi" });
		this.socket.emit("open_output", { type: "rtp", name: "test rtp midi" });
    },

    disconnectUserClients: function(){
    	for(var inputId in this.clients.inputs){
			for(var outputId in this.clients.outputs){
				var param = {inputId: inputId, outputId: outputId, connect: false}
				this.socket.emit("add_connection", param);
			}
    	}
    },

    connectUserClients: function(){
    	this.connectClients("json", this.name, "osc", "localhost:12345", true);
    	this.connectClients("json", this.name, "midi", "test virtual midi", true);
    	this.connectClients("json", this.name, "rtp", "test rtp midi", true);

    	this.connectClients("osc", "localhost:12345", "json", this.name, true);
    	this.connectClients("midi", "test virtual midi", "json", this.name, true);
    	this.connectClients("rtp", "test rtp midi", "json", this.name, true);

    	this.connectClients("osc", "localhost:12345", "analyzer", "Analyzer", true);
    },

	connectClients: function(inType, inName, outType, outName, connect){
		var param = {
			inputId: this.getClientId(this.clients.inputs, inType, inName),
			outputId: this.getClientId(this.clients.outputs, outType, outName),
			connect: connect
		};
		this.socket.emit("add_connection", param);
	},
	getClientId: function(io, type, name){
    	for(var id in io){
    		if(io[id].type == type && io[id].name == name){
    			return id;
    		}
    	}
    	return undefined;
	},

    sendJSON: function(){
        for(var i = 0; i < this.param.count; i++){
        	for(var j in this.test_json){
	            this.socket.emit("message_json", this.test_json[j]);
	            this.numSent++;
        	}
        }
        
        if(this.sendPeriodic){
            setTimeout(this.sendJSON.bind(this), 125);
        }
    },

    sendJSONstart: function(){
        this.sendPeriodic = true;
        this.sendJSON();
    },

    sendJSONstop: function(){
        this.sendPeriodic = false;
    },
	
    test_modules: function(){
		this.numModuleTest = 0;
      	for(var j in this.test_json){
	        this.socket.emit("test_modules", this.test_json[j]);
    	}
	},
	
	onTestModules : function(msg){
		this.moduleTestResult[this.numModuleTest] = msg;
		this.numModuleTest++;
	}
}
