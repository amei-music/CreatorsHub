var fs = require('fs');
var http = require('http');
var server = http.createServer(handler);
var APP_PORT = 8090;
var SPEAKS_ADDR = 'http://localhost:16080'
var io = require('socket.io').listen(server);
var midiSocket = require('socket.io-client').connect(SPEAKS_ADDR);

server.listen(APP_PORT);

console.log("index js");

function handler (req, res) {
  console.log("handler");
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

server.on('request', function(req, res) {
  console.log("server request");
});

io.on('connection', function(socket) {
  console.log("connection");
});
io.sockets.on('event', function(socket) {
  console.log("event");
});
io.sockets.on('disconnect', function(socket) {
  console.log("disconnected to SPEAKS");
});

midiSocket.on('connect', function() {
  console.log('[MidiSocket] Establishing connection');
  midiSocket.emit('join_as_wsjson', {name: 'Touch and Swipe'});

  var ch = 0;
  var notenum = 100;
  var velocity = 110;
  var noteArg = [ch, notenum, velocity];
  var msg = {address:'/noteon', args: noteArg};
  midiSocket.emit('message_json', msg);});

/*
midiSocket.noteOn = function(ch, notenum, velocity) {
  var noteArg = [ch, notenum, velocity];
  var msg = {address: prefix('/noteon'), args: noteArg};
  midiSocket.emit('message_json', msg);
}
*/
