/**
* 各種マウスイベント、タッチイベントを取得していますが、
* 現状ではtouchstart, toucnendにのみ反応します
* つまりPCのブラウザからは動作しません
*/

var gSocket;
var canvas;
var isMouseDown = false;
var isTouchDevice = ('ontouchstart' in window);

function init() {
  // set canvas size to full screen
  resize();

  // socket connect and disconnect callback
  gSocket.on( "connect", function() {
    console.log("client has connected");
  });
  gSocket.on( "disconnect", function() {
    console.log("client has disconnected");
  });

  // mouse event
  if (!isTouchDevice) {
    canvas.addEventListener('mousedown', function(e) {
      console.log("mouse down");
      console.log(e);
      isMouseDown = true;
      var mouseID = 0; // マウスは一点しかクリック出来ないので0固定
      onDown(e, mouseID);
    }, false);
  }
  if (!isTouchDevice) {
    canvas.addEventListener('mousemove', function(e) {
      if (isMouseDown) {
        console.log("mouse move");
        console.log(e);
        onMove(e);
      }
    }, false);
  }

  if (!isTouchDevice) {
    canvas.addEventListener('mouseup', function(e) {
      console.log("mouse up");
      isMouseDown = false;
      var mouseID = 0; // マウスは一点しかクリック出来ないので0固定
      onUp(e, mouseID);
    }, false);
  }

  canvas.addEventListener('touchstart', function(e) {
   console.log("touch start");
   console.log(e);
   for (var i = 0; i < event.changedTouches.length; i++) {
     var touch = event.changedTouches[i];
     console.log(touch.pageX + "," + touch.pageY);
     onDown(touch, touch.identifier);
   }
  }, false);
 canvas.addEventListener('touchmove', function(e) {
   for (var i = 0; i < event.changedTouches.length; i++) {
     var touch = event.changedTouches[i];
     console.log(touch.pageX + "," + touch.pageY);
     onMove(touch);
   }
  }, false);
 canvas.addEventListener('touchend', function(e) {
   for (var i = 0; i < event.changedTouches.length; i++) {
     var touch = event.changedTouches[i];
     console.log(touch.pageX + "," + touch.pageY);
     onUp(touch, touch.identifier);
   }
 }, false);
}

function resize() {
  $('#myCanvas').get( 0 ).width = $( window ).width();
  $('#myCanvas').get( 0 ).height = $( window ).height();
  console.log('Connecting to server');
  canvas = document.getElementById('myCanvas');
  var ctx = canvas.getContext('2d');

  // fill canvas with gray
  ctx.fillStyle = 'rgb(200,200,200)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  gSocket = io.connect();

  // set title
  ctx.fillStyle='#ffffff';
  ctx.font='26px Arial';
  ctx.textAlign='left';
  var gap = 26;
  var currentY = 32;
  ctx.fillText("Send Note On by TouchDown", 10, currentY);
  currentY += gap;
  ctx.fillText("Send Note Off by TouchUp", 10, currentY);
  currentY += gap;
  ctx.fillText("left: low note --- high note : right", 10, currentY);
  currentY += gap;
  ctx.fillText("up: low velocity --- high velocity : down", 10, currentY);
}

function onDown(e, id) {
  console.log("on down");
  console.log(e);
  x = e.pageX;
  y = e.pageY;
  sendDown(x, y, id);

  // debug print on canvas
  var canvas = document.getElementById('myCanvas');
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(200,200,200)';
  var ypos = 152;
  var fontsize = 10;
  ctx.fillRect(10,ypos-fontsize,100,fontsize);
  ctx.fillStyle='#ffffff';
  ctx.font='10px Arial';
  ctx.textAlign='left';
  ctx.fillText("down id:"+id, 10, ypos);
}

function onMove(e) {
  console.log("on move");
  console.log(e.pageX + "," + e.pageY);
}

function onUp(e, id) {
  console.log("on up");
  console.log("on down");
  console.log(e);
  x = e.pageX;
  y = e.pageY;
  sendUp(x, y, id);

  // debug print on canvas
  var canvas = document.getElementById('myCanvas');
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(200,200,200)';
  var ypos = 162;
  var fontsize = 10;
  ctx.fillRect(10,ypos-fontsize,100,fontsize);
  ctx.fillStyle='#ffffff';
  ctx.font='10px Arial';
  ctx.textAlign='left';
  ctx.fillText("up id:"+id, 10, ypos);
}

function sendDown(x, y, id) {
  var windowWidth = window.innerWidth;
  var windowHeight = window.innerHeight;
  x = x / windowWidth;
  y = y / windowHeight;
  gSocket.emit("down", {x:x, y:y, id:id});
}

function sendUp(x, y, id) {
  var windowWidth = window.innerWidth;
  var windowHeight = window.innerHeight;
  x = x / windowWidth;
  y = y / windowHeight;
  gSocket.emit("up", {x:x, y:y, id:id});
}
function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}
