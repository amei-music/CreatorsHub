//
//  tile.cpp
//  oscSequencer
//
//  Created by usui on 2016/04/19.
//
//

#include "tile.h"
#include "ofGraphics.h"


Tile::Tile(const int length) : length_(length) {
    on_color_ = ofColor::lightGray;
    off_color_ = ofColor::gray;
    emit_color_ = ofColor::red;
    current_color_ = off_color_;
    isOn(false);
}

Tile::~Tile() {
    ofRemoveListener(ofEvents().mousePressed, this, &Tile::mousePressed);
}

void Tile::setup(){
    ofAddListener(ofEvents().mousePressed, this, &Tile::mousePressed);
}


void Tile::update() {
    float speed = 1.1;
    ofColor target;
    if (is_on_) {
        target = on_color_;
    } else {
        target = off_color_;
    }

    float r = current_color_.r + (target.r - current_color_.r) * 0.1;
    float g = current_color_.g + (target.g - current_color_.g) * 0.1;
    float b = current_color_.b + (target.b - current_color_.b) * 0.1;

    current_color_ = ofColor(r,g,b);
}

void Tile::draw() {
    ofFill();
    ofSetColor(current_color_);
    ofPushMatrix();
    ofTranslate(pos_);
    ofDrawRectangle(0, 0, length_, length_);
    ofPopMatrix();
}

void Tile::isOn(bool b) {
    is_on_ = b;
    if (is_on_) {
        current_color_ = on_color_;
    } else {
        current_color_ = off_color_;
    }
}
bool Tile::isOn() {
    return is_on_;
}

void Tile::emit() {
    current_color_ = emit_color_;
}

void Tile::setPosition(const ofPoint& p) {
    pos_ = p;
}

void Tile::mousePressed(ofMouseEventArgs & mouse){
    ofRectangle r(pos_, length_, length_);
    if (r.inside(mouse)) {
        isOn(!is_on_); //toggle
        cout << "pressed" << this << " " << is_on_ << endl;
    }
}
