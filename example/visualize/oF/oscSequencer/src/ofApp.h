#pragma once

#include <array>
#include "ofMain.h"
#include "ofxOsc.h"
#include "tile.h"

class ofApp : public ofBaseApp{

	public:
		void setup();
		void update();
		void draw();

		void keyPressed(int key);
		void keyReleased(int key);
		void mouseMoved(int x, int y );
		void mouseDragged(int x, int y, int button);
		void mousePressed(int x, int y, int button);
		void mouseReleased(int x, int y, int button);
		void mouseEntered(int x, int y);
		void mouseExited(int x, int y);
		void windowResized(int w, int h);
		void dragEvent(ofDragInfo dragInfo);
		void gotMessage(ofMessage msg);
		
private:
    void sendNoteOn(const int ch, const int note, const int velocity);
    void sendNoteOff(const int ch, const int note, const int velocity);
    void initPosition();
    void drawInfo();

    ofxOscSender sender;

    std::array<std::array<Tile, 16>, 3> sequences;
    //std::array<Tile, 16> sequence2;
    //std::array<Tile, 16> sequence3;
    std::array<bool, 3> ison = {false, false, false};
    std::array<int, 3> note_nums = {64, 62, 60};
    std::array<int, 3> velocities = {127, 127, 127};
    Tile test;
    float startx;
    float endx;
    float startsec;
    float liney;
    float linelen;
    float prevlinex = 0.0f;
    float bpm = 60;
};
