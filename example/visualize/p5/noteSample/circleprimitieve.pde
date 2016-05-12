class CirclePrimitive {
  PVector pos;
  float radius;
  color col;
  
  CirclePrimitive() {
    pos = new PVector(0, 0);
    radius = 0;
  }
  
  CirclePrimitive(float x, float y) {
    pos = new PVector(x, y);
    radius = 0;
  }
  
  void setRadius(float rad) {
    radius = rad;
  }
  
  void setPosition(float x, float y) {
    pos.x = x;
    pos.y = y;
  }
  
  void setColor(color c) {
    col = c;
  }
  
  void update() {
    float target = 0.0;
    radius = (radius - target) / 1.1;
  }
  
  void draw() {
    noStroke();
    fill(col);
    ellipse(pos.x, pos.y, radius, radius);
    if (radius > 1) {
      println(pos.x + " " + pos.y + " " + radius);
    }
  }
}