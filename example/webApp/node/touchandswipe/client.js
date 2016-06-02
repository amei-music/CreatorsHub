var gSocket;
var canvas;

function init() {
  console.log('Connecting to server');
  canvas = document.getElementById('myCanvas');
  var ctx = canvas.getContext('2d');

  // fill canvas with gray
  ctx.fillStyle = 'rgb(200,200,200)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  gSocket = io.connect(); // サーバーに接続

  // socket connect and disconnect callback
  gSocket.on( "connect", function() {
    console.log("client has connected");
  });
  gSocket.on( "disconnect", function() {
    console.log("client has disconnected");
  });

  // canvas event listners
  canvas.addEventListener('click', onClick, false);
}

function onClick(e) {
  console.log("click to send xy");
  x = e.clientX;
  y = e.clientY;
  sendXY(x, y);
}

function sendXY(x, y) {
  var rect = canvas.getBoundingClientRect() ;
  canvasx = rect.left + window.pageXOffset;
  canvasy = rect.top + window.pageYOffset;

  x = x / (canvasx + canvas.width);
  y = y / (canvasy + canvas.height);

  gSocket.emit("xyval", {x:x, y:y});
}
