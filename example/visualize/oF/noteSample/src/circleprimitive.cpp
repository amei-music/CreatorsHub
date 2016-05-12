//
//  circleprimitive.cpp
//  noteSample
//
//  Created by usui on 2016/04/11.
//
//

#include "circleprimitive.h"
#include "ofMain.h"

void CirclePrimitive::update() {
    const float target = 0.0f;
    radius_ = (radius_ - target) / 1.1;
}

void CirclePrimitive::draw() {
    ofPushMatrix();
    ofSetRectMode(OF_RECTMODE_CENTER);
    ofSetColor(color_);
    ofTranslate(pos_);
    ofDrawCircle(0,0,0,radius_);
    ofPopMatrix();
}

void CirclePrimitive::setColor(const ofColor &c) {
    color_ = c;
}

void CirclePrimitive::setPosition(const ofPoint& p) {
    pos_ = p;
}


void CirclePrimitive::setRadius(const float size) {
    radius_ = size;
}

void CirclePrimitive::setZoom(const float ratio) {
    ratio_ = ratio;
}
