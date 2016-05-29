//
//  tile.h
//  oscSequencer
//
//  Created by usui on 2016/04/19.
//
//

#ifndef __oscSequencer__tile__
#define __oscSequencer__tile__

#include "ofColor.h"
#include "ofEvents.h"
#include "ofPoint.h"

class Tile {
public:
    Tile(const int length = 10);
    ~Tile();
    
    void setup();
    void update();
    void draw();
    
    void isOn(bool b);
    bool isOn();
    void emit();
    
    void setPosition(const ofPoint& p);
    void setSize(const int len) { length_ = len; }
    ofPoint getPosition() { return pos_; }
private:
    void mousePressed(ofMouseEventArgs &mouse);
     
    bool is_on_;
    ofColor current_color_;
    
    ofColor on_color_;
    ofColor off_color_;
    ofColor emit_color_;
    int length_;
    
    ofPoint pos_;
};

#endif /* defined(__oscSequencer__tile__) */
