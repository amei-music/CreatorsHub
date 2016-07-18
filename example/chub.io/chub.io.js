/**
 * chub.io.js - 'socket.io.js' loader for Creators'Hub
 */

"use strict";

var chub = {
	param: {
		// Creators'Hub server address (default)
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
        var s = document.createElement("script");
        s.src = "http://" + this.param.server + "/socket.io/socket.io.js";

        var first_s = document.getElementsByTagName("script")[0];
		first_s.parentNode.insertBefore(s, first_s);
	},

	// connect
	connect: function(){
        var url = "ws://" + this.param.server;
		return io.connect(url);
	}
};
chub.init();
