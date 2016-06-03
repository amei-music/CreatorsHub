/**
 * speaks.io.js - 'socket.io.js' loader for SPEAKS
 */

"use strict";

var speaks = {
	param: {
		// SPEAKS server address (default)
		server: "localhost:16080"
	},

	// load 'socket.io.js' from server 
	init: function(){
        // get query parameters
        if(window.location.search.length > 1){
            var query = window.location.search.substring(1);
            var args = query.split('&');
            for(var arg of args){
                var p = arg.split('=');
                this.param[p[0]] = p[1];
            }
        }

        // insert <script> element to load 'socket.io.js' from server
        var server_url = "http://" + this.param.server + "/socket.io/socket.io.js";
        var s = document.createElement("script");
        s.src = server_url;

        // if "speaks.io" tag exist, insert it after this.
        var e = document.getElementById("speaks.io");
        if(e){
	        e.parentElement.insertBefore(s, e.nextSibling);
        }else{
        	// in not exist, insert it at end of <head>
        	document.head.appendChild(s);
        }
	},

	// connect
	connect: function(){
        var url = "ws://" + this.param.server;
		return io.connect(url);
	}
};
speaks.init();
