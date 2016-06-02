#include "ofApp.h"
#include "midimessage.h"

static const int PORT = 24080;

//--------------------------------------------------------------
void ofApp::setup(){
    bgcolor = ofColor::black;
    receiver.setup(PORT);
    ofEnableBlendMode(OF_BLENDMODE_ADD);
}

//--------------------------------------------------------------
void ofApp::update(){
    receiveOSC();
    
    for (auto& circle : circles) {
        circle.update();
    }
}

//--------------------------------------------------------------
void ofApp::draw(){
    ofBackground(bgcolor);
    drawInfo();
    ofFill();
    for (auto& circle : circles) {
        circle.draw();
    }
}

/**
 * @brief keyPressed emulates note on
 */
void ofApp::keyPressed(int key){
    int num = key % 128;
    int velo = ofRandom(128);
    noteOn(0, num, velo);
}

//--------------------------------------------------------------
void ofApp::keyReleased(int key){

}

//--------------------------------------------------------------
void ofApp::mouseMoved(int x, int y ){

}

/**
 * @brief mosueDragged emulates control change
 */
void ofApp::mouseDragged(int x, int y, int button){
    int ch = 0;
    int cc_num = ofRandom(128);
    int value = static_cast<float>(x) / ofGetWidth() * 128.0;
    controlChange(ch, cc_num, value);
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

}

//--------------------------------------------------------------
void ofApp::gotMessage(ofMessage msg){

}

//--------------------------------------------------------------
void ofApp::dragEvent(ofDragInfo dragInfo){ 

}

void ofApp::noteOn(const int ch, const int noteNum, const int velocity) {
    const float max_radius = 120;
    const float min_radius = 20;
    float radius = velocity / 127.0 * (max_radius - min_radius) + min_radius;
    const float px = ofGetWidth() * noteNum / 128.0;
    const float py = (ofGetHeight() - (ofGetHeight() * velocity / 128.0));
    ofColor c = ofColor::fromHsb(noteNum / 128.0 * 255, velocity / 128.0 * 255, 255);
    
    ofPoint p(px, py);
    CirclePrimitive& circle = circles.at(index);
    circle.setColor(c);
    circle.setRadius(radius);
    circle.setPosition(p);
    circle.setColor(c);
    
    index = ofWrap(index + 1, 0, circles.size() - 1); // increment
}

void ofApp::controlChange(const int ch, const int cc_num, const int value) {
    float b = ofMap(value, 0, 128, 0, 200); //value; / 128.0 * 255.0;
    bgcolor.setBrightness(b);
}


void ofApp::receiveOSC() {
    while (receiver.hasWaitingMessages()) {
        ofxOscMessage m;
        receiver.getNextMessage(m);
        cout << m.getAddress() << endl;
        if (m.getAddress() == _midi_noteon) {
            int ch = m.getArgAsInt(0);
            int note_num = m.getArgAsInt(1);
            int velo = m.getArgAsInt(2);
            noteOn(ch, note_num, velo);
            latest_note = {ch, note_num, velo};
        } else if (m.getAddress() == _midi_controlchange) {
            int ch = m.getArgAsInt(0);
            int cc_num = m.getArgAsInt(1);
            int value = m.getArgAsInt(2);
            controlChange(ch, cc_num, value);
            latest_cc = {ch, cc_num, value};
        }
    }
}

void ofApp::drawInfo() {
    ofPushMatrix();
    ofTranslate(0,20);
    ofSetColor(ofMap(latest_cc.at(2), 0, 128, 200, 0));
    float fps = ofGetFrameRate();
    
    std::stringstream ss;
    ss << "FPS=" << fps;
    
    std::stringstream oscss;
    oscss << "OSC receive port=" << PORT;
    
    std::stringstream noteinfoss;
    noteinfoss << "Latest Note#" << latest_note.at(1) << "[" << latest_note.at(2) << "] ch" << latest_note.at(0)+1 << " / ";
    
    std::stringstream ccinfoss;
    noteinfoss << "Latest CC#" << latest_cc.at(1) << "[" << latest_cc.at(2) << "] ch" << latest_cc.at(0)+1;
    
    std::string separator = "MW1 settings";
    std::string mw1setting = "Add OSC send - host:localhost port:24080";
    std::string mw1connection = "Connect MIDI device or app to localhost:24080";
    std::string operation = "Send MIDI note or control change to change visual";
    
    
    int ypos = 10;
    int gap = 15;
    ofDrawBitmapString(ss.str().c_str(), 10, ypos);
    
    ypos += gap;
    ofDrawBitmapString(oscss.str().c_str(), 10, ypos);

    ypos += gap;
    ofDrawBitmapString(noteinfoss.str().c_str(), 10, ypos);
    
    ypos += gap;
    ofDrawBitmapString(ccinfoss.str().c_str(), 10, ypos);
    
    ypos += gap;
    ofDrawBitmapString(separator, 10, ypos);
    ypos += gap;
    ofDrawBitmapString(mw1setting, 10, ypos);
    ypos += gap;
    ofDrawBitmapString(mw1connection, 10, ypos);
    ypos += gap;
    ofDrawBitmapString(operation, 10, ypos);
    
    ofPopMatrix();
}