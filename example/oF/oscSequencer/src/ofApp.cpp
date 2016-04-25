#include "ofApp.h"

//--------------------------------------------------------------
void ofApp::setup(){
    sender.setup("localhost", 12345);
    
    initPosition();

    startsec = ofGetElapsedTimef();
}

//--------------------------------------------------------------
void ofApp::update(){
    for (auto &t : sequence1) {
        t.update();
    }
    
    for (auto &t : sequence2) {
        t.update();
    }
    for (auto &t : sequence3) {
        t.update();
    }
}

//--------------------------------------------------------------
void ofApp::draw(){
    float elapsed = ofGetElapsedTimef() - startsec;
    float spb = 60./bpm;
    float totaltime = sequence1.size() * spb / 4.0;
    float rate = fmod(elapsed, totaltime) / totaltime;
    float linex = (endx - startx) * rate + startx;
    
    ofBackground(0);

    for (auto &t : sequence1) {
        if (t.isOn()) {
            float x = t.getPosition().x;
            if ((x <= linex && x >= prevlinex)
                || (prevlinex > linex && x <= linex)) {
                t.emit();
                sendNoteOn(0, 60, 127);
            }
        }
        t.draw();
    }
    
    for (auto &t : sequence2) {
        if (t.isOn()) {
            float x = t.getPosition().x;
            if ((x <= linex && x >= prevlinex)
                || (prevlinex > linex && x <= linex)) {
                t.emit();
                sendNoteOn(0, 62, 127);
            }
        }
        t.draw();
    }
    
    for (auto &t : sequence3) {
        if (t.isOn()) {
            float x = t.getPosition().x;
            if ((x <= linex && x >= prevlinex)
                || (prevlinex > linex && x <= linex)) {
                t.emit();
                sendNoteOn(0, 64, 127);
            }
        }
        t.draw();
    }
    
    ofSetColor(ofColor::red);
    ofPoint s(linex, liney);
    ofPoint e(linex, liney + linelen);
    ofDrawLine(s, e);
    prevlinex = linex;
}

//--------------------------------------------------------------
void ofApp::keyPressed(int key){

}

//--------------------------------------------------------------
void ofApp::keyReleased(int key){

}

//--------------------------------------------------------------
void ofApp::mouseMoved(int x, int y ){

}

//--------------------------------------------------------------
void ofApp::mouseDragged(int x, int y, int button){

}

//--------------------------------------------------------------
void ofApp::mousePressed(int x, int y, int button){
    
}

//--------------------------------------------------------------
void ofApp::mouseReleased(int x, int y, int button){

}

//--------------------------------------------------------------
void ofApp::mouseEntered(int x, int y){

}

//--------------------------------------------------------------
void ofApp::mouseExited(int x, int y){

}

//--------------------------------------------------------------
void ofApp::windowResized(int w, int h){
    initPosition();
}

//--------------------------------------------------------------
void ofApp::gotMessage(ofMessage msg){

}

//--------------------------------------------------------------
void ofApp::dragEvent(ofDragInfo dragInfo){ 

}

void ofApp::sendNoteOn(const int ch, const int note, const int velocity) {
    ofxOscMessage msg;
    msg.setAddress("/fm/noteon");
    msg.addIntArg(ch);
    msg.addIntArg(note);
    msg.addIntArg(velocity);
    sender.sendMessage(msg);
}

void ofApp::initPosition() {
    float len = ofGetWidth() / 24;
    float grid = 1.0f;
    float hmargin = (ofGetWidth() - (len * sequence1.size() + grid * (sequence1.size()-1))) / 2.0;
    float vmargin = (ofGetHeight() -  len * 5 - grid * 4)/2.0;
    
    int i = 0;
    for (auto &t : sequence1) {
        ofPoint p;
        p.x = i * (len + grid) + hmargin;
        p.y = vmargin;
        t.setPosition(p);
        t.setSize(len);
        t.setup();
        ++i;
    }
    
    i = 0;
    for (auto &t : sequence2) {
        ofPoint p;
        p.x = i * (len + grid) + hmargin;
        p.y = vmargin + (len + grid);
        t.setPosition(p);
        t.setSize(len);
        t.setup();
        ++i;
    }
    
    i = 0;
    for (auto &t : sequence3) {
        ofPoint p;
        p.x = i * (len + grid) + hmargin;
        p.y = vmargin + (len + grid)*2;
        t.setPosition(p);
        t.setSize(len);
        t.setup();
        ++i;
    }
    
    startx = hmargin;
    endx = hmargin + len * sequence1.size() + (grid * sequence1.size()-1);
    liney = vmargin;
    linelen = len * 3 + grid * 2;
}

