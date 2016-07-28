#include "ofApp.h"
#include "midimessage.h"

static const int PORT = 12345;

//--------------------------------------------------------------
void ofApp::setup(){
    sender.setup("localhost", PORT);

    initPosition();

    startsec = ofGetElapsedTimef();
}

//--------------------------------------------------------------
void ofApp::update(){
    for (auto &sequence : sequences) {
        for (auto &t : sequence) {
            t.update();
        }
    }
}

//--------------------------------------------------------------
void ofApp::draw(){
    float elapsed = ofGetElapsedTimef() - startsec;
    float spb = 60./bpm;
    float totaltime = sequences.at(0).size() * spb / 4.0;
    float rate = fmod(elapsed, totaltime) / totaltime;
    float linex = (endx - startx) * rate + startx;

    ofBackground(0);
    drawInfo();

    int sequence_index = 0;
    for (auto &sequence : sequences) {
        for (auto &t : sequence) {
            // event detect
            float x = t.getPosition().x;
            if ((x <= linex && x >= prevlinex)
                || (prevlinex > linex && x <= linex)) {
                if (t.isOn()) {
                    t.emit();
                    sendNoteOn(0, note_nums.at(sequence_index), velocities.at(sequence_index));
                    ison.at(sequence_index) = true;
                } else {
                    if (ison.at(sequence_index)) {
                        sendNoteOff(0, note_nums.at(sequence_index), 0);
                        ison.at(sequence_index) = false;
                    }
                }
            }
            t.draw();
        }
        ++sequence_index;
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
    msg.setAddress(_midi_noteon);
    msg.addIntArg(ch);
    msg.addIntArg(note);
    msg.addIntArg(velocity);
    sender.sendMessage(msg);
}

void ofApp::sendNoteOff(const int ch, const int note, const int velocity) {
    ofxOscMessage msg;
    msg.setAddress(_midi_noteoff);
    msg.addIntArg(ch);
    msg.addIntArg(note);
    msg.addIntArg(velocity);
    sender.sendMessage(msg);
}


void ofApp::initPosition() {
    float len = ofGetWidth() / 24;
    float grid = 1.0f;
    float hmargin = (ofGetWidth() - (len * sequences.at(0).size() + grid * (sequences.at(0).size()-1))) / 2.0;
    float vmargin = (ofGetHeight() -  len * 5 - grid * 4)/2.0;

    int vindex = 0;
    for (auto &sequence :sequences) {
        int hindex = 0;
        for (auto &t : sequence) {
            ofPoint p;
            p.x = hindex * (len + grid) + hmargin;
            p.y = vmargin + (len + grid)* vindex;
            t.setPosition(p);
            t.setSize(len);
            t.setup();
            ++hindex;
        }
        ++vindex;
    }

    startx = hmargin;
    endx = hmargin + len * sequences.at(0).size() + (grid * sequences.at(0).size()-1);
    liney = vmargin;
    linelen = len * 3 + grid * 2;
}

void ofApp::drawInfo() {
    ofPushMatrix();
    ofTranslate(0,20);
    ofSetColor(255);
    float fps = ofGetFrameRate();

    std::stringstream ss;
    ss << "FPS=" << fps;

    std::stringstream oscss;
    oscss << "OSC send port=" << PORT;

    std::string separator = "Creators' Hub settings";
    std::string mw1setting = "Add OSC receive - port:" + std::to_string(PORT);
    std::string mw1connection = "Connect localhost:" + std::to_string(PORT) + " to MIDI sound source";


    int ypos = 10;
    int gap = 15;
    ofDrawBitmapString(ss.str().c_str(), 10, ypos);

    ypos += gap;
    ofDrawBitmapString(oscss.str().c_str(), 10, ypos);

    ypos += gap;
    ofDrawBitmapString(separator, 10, ypos);
    ypos += gap;
    ofDrawBitmapString(mw1setting, 10, ypos);
    ypos += gap;
    ofDrawBitmapString(mw1connection, 10, ypos);

    ofPopMatrix();
}
