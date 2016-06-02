var gSocket;
var canvas;
var isMouseDown = false;

function init() {
  console.log('Connecting to server');
  canvas = document.getElementById('myCanvas');
  var ctx = canvas.getContext('2d');

  // fill canvas with gray
  ctx.fillStyle = 'rgb(200,200,200)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  gSocket = io.connect();

  // socket connect and disconnect callback
  gSocket.on( "connect", function() {
    console.log("client has connected");
  });
  gSocket.on( "disconnect", function() {
    console.log("client has disconnected");
  });

  // mouse event
  canvas.addEventListener('mousedown', function(e) {
    console.log("mouse down");
    console.log(e);
    isMouseDown = true;
    onDown(e);
 }, false);

 canvas.addEventListener('mousemove', function(e) {
   if (isMouseDown) {
   console.log("mouse move");
   console.log(e);
   onMove(e);
 }
}, false);
  canvas.addEventListener('mouseup', function(e) {
    console.log("mouse up");
    isMouseDown = false;
    onUp(e);
  }, false);
 canvas.addEventListener('touchstart', function(e) {
   console.log("touch start");
   console.log(e);
    onDown(e);
  }, false);
 canvas.addEventListener('touchmove', function(e) {
   for (var i = 0; i < event.touches.length; i++) {
     var touch = event.touches[i];
     console.log(touch.pageX + "," + touch.pageY);
     onMove(touch);
   }
  }, false);
 canvas.addEventListener('touchend', onUp, false);
}

function onDown(e) {
  console.log("on down");
  console.log(e.pageX);
  x = e.pageX;
  y = e.pageY;
  sendXY(x, y);
}

function onMove(e) {
  console.log("on move");
  console.log(e.pageX + "," + e.pageY);
}

function onUp(e) {
  console.log("on up");
}

function sendXY(x, y) {
  var rect = canvas.getBoundingClientRect() ;
  canvasx = rect.left + window.pageXOffset;
  canvasy = rect.top + window.pageYOffset;

  x = x / (canvasx + canvas.width);
  y = y / (canvasy + canvas.height);

  gSocket.emit("xyval", {x:x, y:y});
}
