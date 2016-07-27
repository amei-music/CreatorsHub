import oscP5.*;
import netP5.*;

OscP5 oscP5;
int MY_PORT = 24082;
int SEND_PORT = 24081;
float bpm = 60;
NetAddress remote;

Tile[][] sequences = new Tile[3][16];
int noteNums[] = {64, 62, 60};
int velocities[] = {100, 100, 100};
float startx;
float endx;
float startsec;
float liney;
float linelen;
float startmsec;
float prevlinex = 0.0;

int lastNote = 0;

void setup() {
  size(800, 400);

  // initialize
  oscP5 = new OscP5(this, MY_PORT);  
  remote = new NetAddress("localhost", SEND_PORT);
  for (int i = 0; i < sequences.length; ++i) {
    for (int j = 0; j < sequences[i].length; ++j) {
      sequences[i][j] = new Tile();
    }
  }

  // position
  initPosition();

  startmsec = millis();
}

void update() {
  for (int i = 0; i < sequences.length; ++i) {
    for (int j = 0; j < sequences[i].length; ++j) {
      sequences[i][j].update();
    }
  }
}

void draw() {
  update();
  
  background(180);

  float elapsed = (millis() - startmsec) / 1000.0;
  float sec_per_beat = 60./bpm;
  float totaltime = sequences[0].length * sec_per_beat / 4.0;
  float rate = elapsed % totaltime / totaltime;
  float linex = (endx - startx) * rate + startx;

  for (int i = 0; i < sequences.length; ++i) {
    for (int j = 0; j < sequences[i].length; ++j) {
      float x = sequences[i][j].getPosition().x;
      if ((x <= linex && x >= prevlinex)
        || (prevlinex > linex && x <= linex)) {
        if (sequences[i][j].isOn()) {
          sequences[i][j].emit();
          sendNoteOn(0, noteNums[i], velocities[i]);
        }
      }

      float x2 = x + sequences[i][j].getSize();
      if ((x2 <= linex && x2 >= prevlinex)
        || (prevlinex > linex && x2 <= linex)) {
        if (sequences[i][j].isOn()) {
          sendNoteOff(0, noteNums[i], velocities[i]);
        }
      }
      sequences[i][j].draw();
    }
  }

  stroke(200, 0, 0);
  line(linex, liney, linex, liney + linelen);

  prevlinex = linex;
  
  drawInfo();
}

void initPosition() {
  float len = width / 24;
  float grid = 1.0f;
  float hmargin = (width - (len * sequences[0].length + grid * (sequences[0].length-1))) / 2.0;
  float vmargin = (height -  len * 5 - grid * 4)/2.0;
  for (int vindex = 0; vindex < sequences.length; ++vindex) {
    for (int hindex = 0; hindex < sequences[vindex].length; ++hindex) {
      float x = hindex * (len + grid) + hmargin;
      float y = vmargin + (len + grid)* vindex; 
      sequences[vindex][hindex].setPosition((int)x, (int)y);
      sequences[vindex][hindex].setSize((int)len);
    }
  }
  startx = hmargin;
  endx = hmargin + len * sequences[0].length + (grid * sequences[0].length-1);
  liney = vmargin;
  linelen = len * 3 + grid * 2;
}

void sendNoteOn(int ch, int noteNum, int velocity) {
  //println("note on");
  OscMessage noteOn = new OscMessage("/midi/noteon");
  noteOn.add(ch);
  noteOn.add(noteNum);
  noteOn.add(velocity);
  oscP5.send(noteOn, remote);
  
  lastNote = noteNum;
}

void sendNoteOff(int ch, int noteNum, int velocity) {
  //println("note off");
  OscMessage noteOff = new OscMessage("/midi/noteoff");
  noteOff.add(ch);
  noteOff.add(noteNum);
  noteOff.add(velocity);
  oscP5.send(noteOff, remote);
}

void mousePressed() {
  for (int i = 0; i < sequences.length; ++i) {
    for (int j = 0; j < sequences[i].length; ++j) {
      sequences[i][j].isClicked(mouseX, mouseY);
    }
  }
}

void drawInfo() {
  String portinfo =  "OSC Send Port="+ str(SEND_PORT);
  String noteinfo = "Latest Sent Note#" + lastNote; 
  fill(0);
  text(portinfo, 10, 15);
  text(noteinfo, 10, 30);
}