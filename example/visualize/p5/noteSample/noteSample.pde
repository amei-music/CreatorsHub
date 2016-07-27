/**
* Example for Creators' Hub
* Need oscP5
* Note On -> Circle
* Control Change -> Background color
* OSC Receive Port 24080
*/
import oscP5.*;

OscP5 oscP5;
int PORT = 24080;
CirclePrimitive[] circles;
int index = 0;
int brightness = 0;
int[] lastNote = {0,0,0};
int[] lastCC = {0,0,0};

void setup() {
  size(400, 400);
  oscP5 = new OscP5(this, PORT);
  circles = new CirclePrimitive[100];
  for (int i = 0; i < circles.length; ++i) {
    circles[i] = new CirclePrimitive();
  }
}

void draw() {
  background(brightness);
  blendMode(ADD);

  drawInfo();

  CirclePrimitive cc = new CirclePrimitive();
  cc.update();
  for (CirclePrimitive c : circles) {
    c.update();
  }

  for (CirclePrimitive c : circles) {
    c.draw();
  }
}


void oscEvent(OscMessage theOscMessage){
  if (theOscMessage.checkAddrPattern("/midi/noteon") == true) {
    int ch = (int)theOscMessage.get(0).floatValue();
    int noteNum = (int)theOscMessage.get(1).floatValue();
    int velocity = (int)theOscMessage.get(2).floatValue();
    noteOn(ch, noteNum, velocity);
    lastNote[0] = ch;
    lastNote[1] = noteNum;
    lastNote[2] = velocity;
  } else if (theOscMessage.checkAddrPattern("/midi/controlchange") == true) {
    int ch = (int)theOscMessage.get(0).floatValue();
    int controlNum = (int)theOscMessage.get(1).floatValue();
    int value = (int)theOscMessage.get(2).floatValue();
    controlChange(ch, controlNum, value);
    lastCC[0] = ch;
    lastCC[1] = controlNum;
    lastCC[2] = value;
  }
}

void noteOn(int ch, int noteNum, int velocity) {
  CirclePrimitive circle = circles[index];
  float x = noteNum / 128.0 * width;
  float y = height - (velocity / 128.0 * height);
  circle.setPosition(x, y);
  
  colorMode(HSB, 128, 128, 128);
  color c = color(noteNum, velocity, 128);
  circle.setColor(c);
  
  float radius = velocity + 10;
  circle.setRadius(radius);
  
  incrementIndex();
}

void controlChange(int ch, int controlNum, int value) {
  brightness = (int)map(value, 0, 127, 0, 100);
  println(brightness);
}

void incrementIndex() {
  ++index;
  if (index >= circles.length) {
    index = 0;
  }
}

void drawInfo() {
  String portinfo =  "OSC receive port="+ str(PORT);
  String noteinfo = "Latest Note#" + lastNote[1] + "[" + lastNote[2] + "] ch" + lastNote[0]; 
  String ccinfo = "Latest CC#" + lastCC[1] + "[" + lastCC[2] + "] ch" + lastCC[0]; 
  fill(100);
  text(portinfo, 10, 15);
  text(noteinfo, 10, 30);
  text(ccinfo, 10, 45);
}