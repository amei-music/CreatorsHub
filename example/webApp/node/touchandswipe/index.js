var APP_PORT = 8090;
var HUB_ADDR = 'http://localhost:16080'

var express = require('express');
var app = express();
var http = require('http').Server(app);
var fs = require('fs');
var io = require('socket.io')(http);

app.use(express.static(__dirname));
app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});
http.listen(APP_PORT);

// midi socket connects to the hub as json client
var midiSocket = require('socket.io-client').connect(HUB_ADDR);
midiSocket.on('connect', function() {
  console.log('[MidiSocket] Establishing connection');
  midiSocket.emit('join_as_wsjson', {name: 'Tap And Swipe'});
});

// clinet connection
// clients send xyval message via io.socket
// then this server send note on to the hub via midiSocket
io.sockets.on('connection', function(socket) {
  socket.on('xyval', function(args) {
    console.log("socket id:" + socket.id + " xy args:" + args.x + "," + args.y);
    console.log("send test midi message");

    var ch = 0;
    var notenum = 100;
    var velocity = 110;
    var noteArg = [ch, notenum, velocity];
    var msg = {address:'/noteon', args: noteArg};
    midiSocket.emit('message_json', msg);
  });
});
