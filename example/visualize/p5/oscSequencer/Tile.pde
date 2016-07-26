class Tile {
  PVector pos;
  int len;
  color col;
  boolean isOn = false;
  
  color onColor = color(120,120,120);
  color offColor = color(20,20,20);
  color emitColor = color(200,0,0);
  
  Tile() {
    pos = new PVector(0, 0);
    len = 10;
    col = offColor;
  }
  
  void setPosition(int x, int y) {
    pos.x = x;
    pos.y = y;
  }
  
  PVector getPosition() {
    return pos;
  }
  
  void setSize(int size) {
    len = size;
  }
  
  int getSize() {
    return len;
  }
  
  void update() {
    color target;
    if (isOn) {
        target = onColor;
    } else {
        target = offColor;
    }

    float r = red(col) + (red(target) - red(col)) * 0.1;
    float g = green(col) + (green(target) - green(col)) * 0.1;
    float b = blue(col) + (blue(target) - blue(col)) * 0.1;

    col = color(r,g,b);
  }
  
  void draw() {
    noStroke();
    fill(col);
    rect(pos.x, pos.y , len, len);
  }
  
  void emit() {
    col = emitColor;
  }
  
  boolean isClicked(int x, int y) {
    if (x >= pos.x && x <= (pos.x + len)
    && y >= pos.y && y <= (pos.y + len)) {
      isOn = !isOn;
      if(isOn) {
        col = onColor;
      } else {
        col = offColor;
      }
      return true;
    } else {
      return false;
    }
  }
  
  boolean isOn() {
    return isOn;
  }
  void isOn(boolean ison) {
    isOn = ison;
  }
  
}