"use strict";

// TODO:

;(function($, THREE, Global) {
    let log = Global.utils.log;

    const radToDeg = 180 / Math.PI;
    const degToRad = Math.PI / 180;
    
    /**
     *  @author: Aram Gevorgyan
     *  @description: linear algebra library, represents classes for Vec2, Vec3 vectors and 2, 3 dimensional square matrices
     *  plus some often used algorithms
     *  @creation date: 15/11/2015 
     */
    
    /**
     *  Vec2 class
     *  2 dimensional affine vector
     */
    function Vec2(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }
    
    Vec2.prototype.length = function() {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    };
    
    Vec2.prototype.add = function(v) {
        return new
            Vec2(this.x + v.x, this.y + v.y);
    };
    
    Vec2.prototype.sub = function(v) {
        return new
            Vec2(this.x - v.x, this.y - v.y);
    };
    
    Vec2.prototype.multScalar = function(scalarValue) {
        return new
            Vec2(this.x * scalarValue, this.y * scalarValue);
    };
    
    Vec2.prototype.normalize = function() {
        var invLength = 1/this.length();
        this.x *= invLength;
        this.y *= invLength;
        return this;
    };
    
    Vec2.prototype.dot = function(v) {
        return this.x * v.x + this.y * v.y;
    };
    
    Vec2.prototype.rotate = function(phi) {
        return new
            Vec2(this.x * Math.cos(phi) - this.y * Math.sin(phi), this.x*Math.sin(phi) + this.y * Math.cos(phi));
    };
    
    Vec2.prototype.copy = function() {
        return new
            Vec2(this.x, this.y);
    };
    
    Vec2.prototype.set = function(x, y) {
        this.x = x;
        this.y = y;
    };
    
    
    /**
     *  Vec3 class
     *  3 dimensional affine vector
     */
    function Vec3(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;   
    }
    
    Vec3.prototype.length = function() {
        return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
    };
    
    Vec3.prototype.add = function(v) {
        return new
            Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    };
    
    Vec3.prototype.sub = function(v) {
        return new
            Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    };
    
    Vec3.prototype.multScalar = function(scalarValue) {
        return new
            Vec3(this.x * scalarValue, this.y * scalarValue, this.z * scalarValue);
    };
    
    Vec3.prototype.normalize = function() {
        var invLength = 1/this.length();
        this.x *= invLength;
        this.y *= invLength;
        this.z *= invLength;
        return this;
    };
    
    Vec3.prototype.dot = function(v) {
        return this.x * v.x + this.y * v.y + this.z * v.x;
    };
    
    Vec3.prototype.cross = function(v) {
        return new
            Vec3( this.y*v.z - this.z*v.y, this.z*v.x - this.x*v.y, this.x*v.y - this.y*v.x );
    };
    
    Vec3.prototype.copy = function() {
        return new Vec3(this.x, this.y, this.z);
    };
    
    Vec3.prototype.set = function(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    };
    
    
    
    /////////////////////////////////////////////////   Matrices basic operations  /////////////////////////////////////////////////
    //  all matrices are stored in column-major order
    
    /**
     *  Mat2 class
     *  2x2 column-major matrix
     */
    function Mat2(initMat) {
        this.elements = typeof initMat === 'undefined' ?
            new Float32Array([
                1, 0,
                0, 1
            ])
            : new Float32Array(initMat);
    }
    
    Mat2.prototype.identity = function() {
        this.elements[0] = this.elements[3] = 1;    
        this.elements[1] = this.elements[2] = 0;
    };
    
    Mat2.prototype.add = function(rhs) {
        var a = this.elements, b = rhs.elements;
        return new Mat2([
            a[0] + b[0], a[2] + b[2],
            a[1] + b[1], a[3] + b[3]
        ]);
    };
    
    Mat2.prototype.sub = function(rhs) {
        var a = this.elements, b = rhs.elements;
        return new Mat2([
            a[0] - b[0], a[2] - b[2],
            a[1] - b[1], a[3] - b[3]
        ]);
    };
    
    Mat2.prototype.multScalar = function(value) {
        var a = this.elements;
        return new Mat2([
            a[0]*value, a[2]*value,
            a[1]*value, a[3]*value
        ]);
    };
    
    Mat2.prototype.mult = function(rhs) {
        var a = this.elements, b = rhs.elements;
        return new Mat2([
            a[0]*b[0] + a[2]*b[1], a[1]*b[0] + a[3]*b[1],
            a[0]*b[2] + a[2]*b[3], a[1]*b[2] + a[3]*b[3]
        ]);
    };
    
    Mat2.prototype.multv2 = function(v) {
        var a = this.elements;
        return new Vec2(
            a[0]*v.x + a[2]*v.y,
            a[1]*v.x + a[3]*v.y
        );
    };
    
    Mat2.prototype.transpose = function() {
        var a = this.elements, temp;
        temp = a[2];    a[2] = a[1];    a[1] = temp;
    };
    
    Mat2.prototype.determinant = function() {
        var a = this.elements;
        return a[0]*a[3] - a[2]*a[1];
    };
    
    Mat2.prototype.getInverse = function() {
        var invOut,
            d = this.determinant(),
            a = this.elements;
            
            if ( d == 0 ) {
                console.log("determinant is 0");
                return false;
            }      
            
            d = 1/d;
            invOut = [
                a[3], -a[1],
                -a[2], a[0]
            ];
            
            for (var i = 0; i < 4; i++) {
                invOut[i] *= d;
            }
           
        return new Mat2( invOut );
    };
    
    Mat2.prototype.print = function() {
        for (var i = 0; i < 2; i++) {
            for (var j = 0; j < 2; j++) {
                console.log( this.elements[i*2 + j] );
            }
            console.log('\n');
        }
    };
    
    
    /**
     *  Mat3 class
     *  3x3 column-major matrix
     */
    function Mat3(initMat) {
        this.elements = !initMat?
            new Float32Array([
                1, 0, 0,
                0, 1, 0,
                0, 0, 1
            ])
            : new Float32Array(initMat);
    }
    
    Mat3.prototype.identity = function() {
        this.elements[0] = this.elements[4] = this.elements[8] = 1;    
        this.elements[1] = this.elements[2] = this.elements[3] = this.elements[5] = this.elements[6] = this.elements[7] = 0;
    };
    
    Mat3.prototype.set = function(s11, s12, s13, s21, s22, s23, s31, s32, s33) {
        var a = this.elements;
        a[0] = s11; a[3] = s12; a[6] = s13;
        a[1] = s21; a[4] = s22; a[7] = s23;
        a[2] = s31; a[5] = s32; a[8] = s33;
    };
    
    Mat3.prototype.add = function(rhs) {
        var a = this.elements, b = rhs.elements;
        return new Mat3([
            a[0]+b[0], a[3]+b[3], a[6]+b[6],
            a[1]+b[1], a[4]+b[4], a[7]+b[7],
            a[2]+b[2], a[5]+b[5], a[8]+b[8]
        ]);
    };
    
    Mat3.prototype.sub = function(rhs) {
        var a = this.elements, b = rhs.elements;
        return new Mat3([
            a[0]-b[0], a[3]-b[3], a[6]-b[6],
            a[1]-b[1], a[4]-b[4], a[7]-b[7],
            a[2]-b[2], a[5]-b[5], a[8]-b[8]
        ]);
    };
    
    Mat3.prototype.multScalar = function(value) {
        var a = this.elements;
        return new Mat3([
            a[0]*value, a[3]*value, a[6]*value,
            a[1]*value, a[4]*value, a[7]*value,
            a[2]*value, a[5]*value, a[8]*value,
        ]);
    };
    
    Mat3.prototype.mult = function(rhs) {
        var a = this.elements, b = rhs.elements;
        return new Mat3([
            a[0]*b[0] + a[3]*b[1] + a[6]*b[2],    a[1]*b[0] + a[4]*b[1] + a[7]*b[2],    a[2]*b[0] + a[5]*b[1] + a[8]*b[2],
            a[0]*b[3] + a[3]*b[4] + a[6]*b[5],    a[1]*b[3] + a[4]*b[4] + a[7]*b[5],    a[2]*b[3] + a[5]*b[4] + a[8]*b[5],
            a[0]*b[6] + a[3]*b[7] + a[6]*b[8],    a[1]*b[6] + a[4]*b[7] + a[7]*b[8],    a[2]*b[6] + a[5]*b[7] + a[8]*b[8]
        ]);
    };
    
    Mat3.prototype.multv3 = function(v) {
        var a = this.elements;
        return new Vec3(
            a[0]*v.x+a[3]*v.y+a[6]*v.z,
            a[1]*v.x+a[4]*v.y+a[7]*v.z,
            a[2]*v.x+a[5]*v.y+a[8]*v.z
        );
    };
    
    Mat3.prototype.transpose = function() {
        var a = this.elements, temp;
        temp = a[3];    a[3] = a[1];    a[1] = temp;
        temp = a[6];    a[6] = a[2];    a[2] = temp;
        temp = a[7];    a[7] = a[5];    a[5] = temp;
    };
    
    Mat3.prototype.determinant = function() {
        var a = this.elements;
        return a[0]*a[4]*a[8] - a[0]*a[7]*a[5] - a[3]*a[1]*a[8] + a[3]*a[7]*a[2] + a[6]*a[1]*a[5] - a[6]*a[4]*a[2];
    };
    
    Mat3.prototype.getInverse = function() {
        var invOut,
            d = this.determinant(),
            a = this.elements;
            
            if ( d == 0 ) {
                console.log("determinant is 0");
                return false;
            }      
            
            d = 1/d;
            invOut = [
                a[4]*a[8]-a[7]*a[5], a[7]*a[2]-a[1]*a[8], a[1]*a[5]-a[4]*a[2],
                a[6]*a[5]-a[3]*a[8], a[0]*a[8]-a[6]*a[2], a[3]*a[2]-a[0]*a[5],
                a[3]*a[7]-a[6]*a[4], a[6]*a[1]-a[0]*a[7], a[0]*a[4]-a[3]*a[1]            
            ];
            
            for (var i = 0; i < 9; i++) {
                invOut[i] *= d;
            }
           
        return new Mat3( invOut );
    };
    
    Mat3.prototype.print = function() {
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                console.log( this.elements[i*3 + j] );
            }
            console.log('\n');
        }
    };
    
    function translationMat(tx, ty) {
        return new Mat3([
            1.0,    0.0,    0.0,
            0.0,    1.0,    0.0,
            tx||0,  ty||0,  1.0
        ]);
    }
    
    function rotationMat(alpha) {
        var c = Math.cos(alpha || 0),
            s = Math.sin(alpha || 0);
        return new Mat3([
            c,   s,   0.0, 
            -s,  c,   0.0,
            0.0, 0.0, 1.0
        ]);    
    }
    
    function scaleMat(sx, sy) {
        return new Mat3([
            sx||1,  0.0,    0.0,
            0.0,    sy||1,  0.0,
            0.0,    0.0,    1.0
        ]);
    }
    
    function isInCircle(v, center, R) {	
        var dx = Math.pow(v.x - center.x, 2),
            dy = Math.pow(v.y - center.y, 2);					
        if ( dx + dy <= Math.pow(R, 2) ) {
            return true;
        }
        
        return false;
    }
    
    function isInTriangle(points, v) {
        let v1 = points[0],
            v2 = points[1],
            v3 = points[2],          
            res1 = (v1.x - v.x)*(v2.y - v1.y) - (v2.x - v1.x)*(v1.y - v.y),
            res2 = (v2.x - v.x)*(v3.y - v2.y) - (v3.x - v2.x)*(v2.y - v.y),
            res3 = (v3.x - v.x)*(v1.y - v3.y) - (v1.x - v3.x)*(v3.y - v.y);
        if (   (res1 < 0.0 && res2 < 0.0 && res3 < 0.0) 
            || (res1 > 0.0 && res2 > 0.0 && res3 > 0.0)
            || (res1 == 0 || res2 == 0 || res3 == 0)	)
        {
            return true;
        }
        return false;
    }
    
    function isInSegment(v1, v2, v) {
        let a1 = (v.sub(v1).length());
        let a2 = (v.sub(v2).length());
        let length = v2.sub(v1).length();
        return Math.abs(
                        (new Mat2([
                         v.x - v1.x, v2.x - v1.x,
                         v.y - v1.y, v2.y - v1.y])).determinant()
                        ) < 2000
        && Math.floor(a1 + a2) == Math.floor(length);
    }
    
    //Polygon.prototype.boundingBox = function() {
    //    let points = this.points;	
    //    this.xmin = points[0];
    //    this.xmax = points[0];
    //    this.ymin = points[0];
    //    this.ymax = points[0];
    //    
    //    for (let i = 0; i < points.length; i++) {
    //        if (points[i].x < this.xmin)
    //            this.xmin = points[i].x;
    //    
    //        if (points[i].x > this.xmax)
    //            this.xmax = points[i].x;
    //    
    //        if (points[i].y < this.ymin)
    //            this.ymin = points[i].y;
    //        
    //        if (points[i].y > this.ymax)
    //            this.ymax = points[i].y;
    //    }
    //};
    
    //v1x1, v1y1, v1x2, v1y2, v2x1, v2y1, v2x2, v2y2
    //Polygon.prototype.intersects = function(v1, v2, v3, v4) {
    //    let EPS = 1e-9,
    //        d1, d2, a1, a2, b1, b2, c1, c2
    //        v1x1 = v1.x, v1x2 = v2.x, v1y1 = v1.y, v1y2 = v2.y, //  line 1
    //        v2x1 = v3.x, v2x2 = v4.x, v2y1 = v3.y, v2y2 = v4.y; //  line 2
    //        
    //    a1 = v1y2 - v1y1;
    //    b1 = v1x1 - v1x2;
    //    c1 = (v1x2 * v1y1) - (v1x1 * v1y2);
    //    d1 = (a1 * v2x1) + (b1 * v2y1) + c1;
    //    d2 = (a1 * v2x2) + (b1 * v2y2) + c1;
    //    if (d1 * d2 > 0)
    //        return false;
    //
    //    a2 = v2y2 - v2y1;
    //    b2 = v2x1 - v2x2;
    //    c2 = (v2x2 * v2y1) - (v2x1 * v2y2);
    //    d1 = (a2 * v1x1) + (b2 * v1y1) + c2;
    //    d2 = (a2 * v1x2) + (b2 * v1y2) + c2;
    //    if (d1 * d2 > 0)
    //        return false;
    //    
    //    if (Math.abs((a1 * b2) - (a2 * b1)) < EPS)
    //        return false;
    //
    //    return true;
    //};
    //
    //Polygon.prototype.contains = function(v) {
    //    let points = this.points, c = 0;
    //    //if (this.xmin === undefined && this.xmax === undefined) {
    //    //  this.boundingBox();
    //    //}    
    //    //if (v.x < this.xmin || v.y < this.ymin || v.x > this.xmax || v.y > this.ymax) {
    //    //  log("bounding box test")  
    //    //  return false;
    //    //}
    //    let v1 = new Vec2(this.xmin-100, this.ymin-100);
    //    for (let i = 0, j = points.length - 1; i < points.length; j = i++)
    //    {
    //        if ( this.intersects(v1, v, points[i], points[j]) ) {
    //            c++;
    //        }
    //    }
    //    return (c & 1) == 1;
    //};
    
    
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    //  returns inner angle (v2) of 3 points in degrees
    function getAngle(v1, v2, v3) {
        let a, b, dot, alen, blen;
        a = v1.sub(v2); b = v3.sub(v2);
        dot = a.dot(b);
        alen = a.length();
        blen = b.length();
        if (alen < 1e-7 || blen < 1e-7) {
            return 0.0;
        }
        return Math.acos(dot / (alen*blen));
    }
    
    function toWorldSpace(point2D, w, h, camera, mat4) {
        let x = 2 * point2D.x / w - 1;
        let y = 1 - 2 * point2D.y / h;
        
        mat4.getInverse(mat4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));        
        
        return new THREE.Vector3(x, y, 0).applyMatrix4(mat4);
    }
    
    Global.math = Global.math || {
        Vec2: Vec2,
        Vec3: Vec3,
        Mat2: Mat2,
        Mat3: Mat3,
        isInCircle: isInCircle,
        isInSegment: isInSegment,
        isInTriangle: isInTriangle,
        translationMat: translationMat,
        rotationMat: rotationMat,
        scaleMat: scaleMat,
        getRandomInt: getRandomInt,
        radToDeg: radToDeg,
        degToRad: degToRad,
        getAngle: getAngle,
        toWorldSpace: toWorldSpace
    };

})(jQuery, THREE, DSSGeometry);