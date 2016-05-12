//
//  circleprimitive.h
//  noteSample
//
//  Created by usui on 2016/04/11.
//
//

#ifndef __noteSample__circleprimitive__
#define __noteSample__circleprimitive__

#include "ofColor.h"
#include "ofPoint.h"

class CirclePrimitive {
public:
    void update();
    void draw();
    void setColor(const ofColor &c);
    void setPosition(const ofPoint& p);
    void setRadius(const float size);
    void setZoom(const float ratio);
private:
    ofColor color_;
    ofPoint pos_;
    float radius_;
    float ratio_;
};

#endif /* defined(__noteSample__circleprimitive__) */
