#pragma once

#include <array>
#include "ofMain.h"
#include "ofxOsc.h"
#include "circleprimitive.h"

/**
 * @brief Visualizer using NoteOn and ControlChange
 */
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
        void noteOn(const int ch, const int noteNum, const int velocity);
        void controlChange(const int ch, const int cc_num, const int value);
        void receiveOSC();
        void drawInfo();

        ofxOscReceiver receiver;
        ofColor bgcolor;
        std::array<CirclePrimitive, 128> circles;
        int index = 0;
    
        std::array<int, 3> latest_note;
        std::array<int, 3> latest_cc;
};
