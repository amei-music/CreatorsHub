/**
* Example for mw1
* Need oscP5
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
  if (theOscMessage.checkAddrPattern("/fm/noteon") == true) {
    int ch = (int)theOscMessage.get(0).floatValue();
    int noteNum = (int)theOscMessage.get(1).floatValue();
    int velocity = (int)theOscMessage.get(2).floatValue();
    noteOn(ch, noteNum, velocity);
    lastNote[0] = ch;
    lastNote[1] = noteNum;
    lastNote[2] = velocity;
  } else if (theOscMessage.checkAddrPattern("/fm/controlchange") == true) {
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

/**
* @brief keyPressed emulate note on
*/
void keyPressed() {
  println("key pressed");
  int ch = 0;
  int controlNum = (int)random(128);
  int velocity = (int)random(128);
  
  noteOn(ch, controlNum, velocity);
}

/**
* @brief mouse drag emulates control change
*/
void mouseDragged() {
  float v = (float)mouseX / width;
  int ch = 0;
  int num = 0;
  int val = (int)(v * 128.0);
  controlChange(ch, num, val);
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