"use strict";

// TODO:

/**
 * @author: Aram Gevorgyan
 * @description: linear algebra library, represents classes for Vec2, Vec3 vectors and 2, 3 dimensional square matrices
 * plus some often used algorithms
 * @creation date: 15/11/2015 
 */

;(function($, THREE, Global) {
    let log = Global.utils.log;
    
    /**
     * @constant radToDeg - converts radians to degress by multiplying it with radians
     */
    const radToDeg = 180 / Math.PI;
    
    /**
     * @constant degToRad - converts degress to radians by multiplying it with degress
     */
    const degToRad = Math.PI / 180;
    
    /**
     * @constant point3DSize - radius of the point in 3d space
     */
    const point3DSize = 10;
    
    
    /**
     * @constructor Vec2 - 2 dimensional vector
     */
    function Vec2(x, y) {
        this.x = x || 0;
        this.y = y || 0;
    }
    
    /**
     * @function length - computes length of 2d vector
     * @returns {Number} length of 2d vector
     */
    Vec2.prototype.length = function() {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    };
    
    /**
     * @function add - adds vector v to this vector
     * @param {Vec2} v - adding vector
     * @returns {Vec2} new 2d vector as a result of vectors addition
     */
    Vec2.prototype.add = function(v) {
        return new
            Vec2(this.x + v.x, this.y + v.y);
    };
    
    /**
     * @function sum - subtracts vector v from this vector
     * @param {Vec2} v - subtracting vector
     * @returns {Vec2} new 2d vector as a result of vectors subtraction
     */
    Vec2.prototype.sub = function(v) {
        return new
            Vec2(this.x - v.x, this.y - v.y);
    };
    
    /**
     * @function multScalar - multiplis this with scalarValue
     * @param {Number} scalarValue - value to multiply
     * @returns {Vec2} new 2d vector as a result of vector and scalar value multiplication
     */
    Vec2.prototype.multScalar = function(scalarValue) {
        return new
            Vec2(this.x * scalarValue, this.y * scalarValue);
    };
    
    /**
     * @function normalize - makes this vector unit
     * @returns {Vec2} a reference to this vector
     */
    Vec2.prototype.normalize = function() {
        var invLength = 1/this.length();
        this.x *= invLength;
        this.y *= invLength;
        return this;
    };
    
    /**
     * @function dot - computes dot product of this and vector v
     * @returns {Number} dot product value
     */
    Vec2.prototype.dot = function(v) {
        return this.x * v.x + this.y * v.y;
    };
    
    /**
     * @function rotate - rotates this vector by phi radians around origin
     * @returns {Vec2} new 2d rotated by phi radians vector
     */
    Vec2.prototype.rotate = function(phi) {
        return new
            Vec2(this.x * Math.cos(phi) - this.y * Math.sin(phi), this.x*Math.sin(phi) + this.y * Math.cos(phi));
    };
    
    /**
     * @function copy - copies this vector
     * @returns {Vec2} new 2d vector, a copied one
     */
    Vec2.prototype.copy = function() {
        return new
            Vec2(this.x, this.y);
    };
    
    /**
     * @function set - updates x and y components values of this vector
     */
    Vec2.prototype.set = function(x, y) {
        this.x = x;
        this.y = y;
    };
    
    
    /**
     * @constructor Vec3 - 3 dimensional vector
     */
    function Vec3(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;   
    }
    
    /**
     * @function length - computes length of 3d vector
     * @returns {Number} length of 3d vector
     */
    Vec3.prototype.length = function() {
        return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
    };
    
    /**
     * @function add - adds vector v to this vector
     * @param {Vec3} v - adding vector
     * @returns {Vec3} new 3d vector as a result of vectors addition
     */
    Vec3.prototype.add = function(v) {
        return new
            Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
    };
    
    /**
     * @function sum - subtracts vector v from this vector
     * @param {Vec3} v - subtracting vector
     * @returns {Vec3} new 3d vector as a result of vectors subtraction
     */
    Vec3.prototype.sub = function(v) {
        return new
            Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
    };
    
    /**
     * @function multScalar - multiplis this with scalarValue
     * @param {Number} scalarValue - value to multiply
     * @returns {Vec3} new 3d vector
     */
    Vec3.prototype.multScalar = function(scalarValue) {
        return new
            Vec3(this.x * scalarValue, this.y * scalarValue, this.z * scalarValue);
    };
    
    /**
     * @function normalize - makes this vector unit
     * @returns {Vec3} a reference to this vector
     */
    Vec3.prototype.normalize = function() {
        var invLength = 1/this.length();
        this.x *= invLength;
        this.y *= invLength;
        this.z *= invLength;
        return this;
    };
    
    /**
     * @function dot - computes dot product of this and vector v
     * @returns {Number} dot product value
     */
    Vec3.prototype.dot = function(v) {
        return this.x * v.x + this.y * v.y + this.z * v.x;
    };
    
    /**
     * @function dot - computes cross product of this and vector v
     * @returns {Vec3} cross product as 3d vector
     */
    Vec3.prototype.cross = function(v) {
        return new
            Vec3( this.y*v.z - this.z*v.y, this.z*v.x - this.x*v.y, this.x*v.y - this.y*v.x );
    };
    
    /**
     * @function copy - copies this vector
     * @returns {Vec3} new 3d vector, a copied one
     */
    Vec3.prototype.copy = function() {
        return new Vec3(this.x, this.y, this.z);
    };
    
    /**
     * @function set - updates x, y and z components values of this vector
     */
    Vec3.prototype.set = function(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    };
    
    
    
    /////////////////////////////////////////////////   Matrices basic operations  /////////////////////////////////////////////////
    //  all matrices are stored in column-major order
    
    /**
     * @constructor Mat2 - 2x2 column-major matrix
     */
    function Mat2(initMat) {
        this.elements = typeof initMat === 'undefined' ?
            new Float32Array([
                1, 0,
                0, 1
            ])
            : new Float32Array(initMat);
    }
    
    /**
     * @function identity - makes this matrix as unit
     */
    Mat2.prototype.identity = function() {
        this.elements[0] = this.elements[3] = 1;    
        this.elements[1] = this.elements[2] = 0;
    };
    
    /**
     * @function add - adds two matrices
     * @param {Mat2} rhs - right matrixs 
     * @returns {Mat2} new matrix as a result of addition
     */
    Mat2.prototype.add = function(rhs) {
        var a = this.elements, b = rhs.elements;
        return new Mat2([
            a[0] + b[0], a[2] + b[2],
            a[1] + b[1], a[3] + b[3]
        ]);
    };
    
    /**
     * @function sub - subtracts two matrices
     * @param {Mat2} - subtracting matrix
     * @returns {Mat2} - new matrix as a result of subtraction
     */
    Mat2.prototype.sub = function(rhs) {
        var a = this.elements, b = rhs.elements;
        return new Mat2([
            a[0] - b[0], a[2] - b[2],
            a[1] - b[1], a[3] - b[3]
        ]);
    };
    
    /**
     * @function multScalar - multiplies this matrix with a scalar value
     * @param {Number} - value matrix
     * @returns {Mat2} - new matrix as a result of scalar multiplication
     */
    Mat2.prototype.multScalar = function(value) {
        var a = this.elements;
        return new Mat2([
            a[0]*value, a[2]*value,
            a[1]*value, a[3]*value
        ]);
    };
    
    /**
     * @function mult - multiplies this matrix with rhs
     * @param {Mat2} - rhs 
     * @returns {Mat2} - new matrix as a result of matrices multiplication
     */
    Mat2.prototype.mult = function(rhs) {
        var a = this.elements, b = rhs.elements;
        return new Mat2([
            a[0]*b[0] + a[2]*b[1], a[1]*b[0] + a[3]*b[1],
            a[0]*b[2] + a[2]*b[3], a[1]*b[2] + a[3]*b[3]
        ]);
    };
    
    /**
     * @function multv2 - multiplies this matrix with vector v
     * @param {Vec2} - vector to multiply with
     * @returns {Mat2} - new 2d vector as a result of matrix * vector multiplication
     */
    Mat2.prototype.multv2 = function(v) {
        var a = this.elements;
        return new Vec2(
            a[0]*v.x + a[2]*v.y,
            a[1]*v.x + a[3]*v.y
        );
    };
    
    /**
     * @function transpose - transposes this matrix
     */
    Mat2.prototype.transpose = function() {
        var a = this.elements, temp;
        temp = a[2];    a[2] = a[1];    a[1] = temp;
    };
    
    /**
     * @function determinant - computes determinant of this
     * @returns {Number} - value of determinant
     */
    Mat2.prototype.determinant = function() {
        var a = this.elements;
        return a[0]*a[3] - a[2]*a[1];
    };
    
    /**
     * @function getInverse - computes an inverse of this matrix
     * @returns {Mat2} - inverse matrix
     */
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
    
    /**
     * @function print - prints out all elements of this matrix
     */
    Mat2.prototype.print = function() {
        for (var i = 0; i < 2; i++) {
            for (var j = 0; j < 2; j++) {
                console.log( this.elements[i*2 + j] );
            }
            console.log('\n');
        }
    };
    
    
    /**
     * @constructor Mat3 - 3x3 column-major matrix
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
    
    /**
     * @function identity - makes this matrix as unit
     */
    Mat3.prototype.identity = function() {
        this.elements[0] = this.elements[4] = this.elements[8] = 1;    
        this.elements[1] = this.elements[2] = this.elements[3] = this.elements[5] = this.elements[6] = this.elements[7] = 0;
    };
    
    /**
     * @function add - adds two matrices
     * @param {Mat3} rhs - right matrix
     * @returns {Mat3} new matrix as a result of addition
     */
    Mat3.prototype.add = function(rhs) {
        var a = this.elements, b = rhs.elements;
        return new Mat3([
            a[0]+b[0], a[3]+b[3], a[6]+b[6],
            a[1]+b[1], a[4]+b[4], a[7]+b[7],
            a[2]+b[2], a[5]+b[5], a[8]+b[8]
        ]);
    };
    
    /**
     * @function sub - subtracts two matrices
     * @param {Mat3} - subtracting matrix
     * @returns {Mat3} - new matrix as a result of subtraction
     */
    Mat3.prototype.sub = function(rhs) {
        var a = this.elements, b = rhs.elements;
        return new Mat3([
            a[0]-b[0], a[3]-b[3], a[6]-b[6],
            a[1]-b[1], a[4]-b[4], a[7]-b[7],
            a[2]-b[2], a[5]-b[5], a[8]-b[8]
        ]);
    };
    
    /**
     * @function multScalar - multiplies this matrix with a scalar value
     * @param {Number} - value matrix
     * @returns {Mat3} - new matrix as a result of scalar multiplication
     */
    Mat3.prototype.multScalar = function(value) {
        var a = this.elements;
        return new Mat3([
            a[0]*value, a[3]*value, a[6]*value,
            a[1]*value, a[4]*value, a[7]*value,
            a[2]*value, a[5]*value, a[8]*value,
        ]);
    };
    
    /**
     * @function mult - multiplies this matrix with rhs
     * @param {Mat3} - rhs 
     * @returns {Mat3} - new matrix as a result of matrices multiplication
     */
    Mat3.prototype.mult = function(rhs) {
        var a = this.elements, b = rhs.elements;
        return new Mat3([
            a[0]*b[0] + a[3]*b[1] + a[6]*b[2],    a[1]*b[0] + a[4]*b[1] + a[7]*b[2],    a[2]*b[0] + a[5]*b[1] + a[8]*b[2],
            a[0]*b[3] + a[3]*b[4] + a[6]*b[5],    a[1]*b[3] + a[4]*b[4] + a[7]*b[5],    a[2]*b[3] + a[5]*b[4] + a[8]*b[5],
            a[0]*b[6] + a[3]*b[7] + a[6]*b[8],    a[1]*b[6] + a[4]*b[7] + a[7]*b[8],    a[2]*b[6] + a[5]*b[7] + a[8]*b[8]
        ]);
    };
    
    /**
     * @function multv3 - multiplies this matrix with vector v
     * @param {Vec3} - vector to multiply with
     * @returns {Vec3} - new 3d vector as a result of matrix * vector multiplication
     */
    Mat3.prototype.multv3 = function(v) {
        var a = this.elements;
        return new Vec3(
            a[0]*v.x+a[3]*v.y+a[6]*v.z,
            a[1]*v.x+a[4]*v.y+a[7]*v.z,
            a[2]*v.x+a[5]*v.y+a[8]*v.z
        );
    };
    
    /**
     * @function transpose - transposes this matrix
     */
    Mat3.prototype.transpose = function() {
        var a = this.elements, temp;
        temp = a[3];    a[3] = a[1];    a[1] = temp;
        temp = a[6];    a[6] = a[2];    a[2] = temp;
        temp = a[7];    a[7] = a[5];    a[5] = temp;
    };
    
    /**
     * @function determinant - computes determinant of this
     * @returns {Number} - value of determinant
     */
    Mat3.prototype.determinant = function() {
        var a = this.elements;
        return a[0]*a[4]*a[8] - a[0]*a[7]*a[5] - a[3]*a[1]*a[8] + a[3]*a[7]*a[2] + a[6]*a[1]*a[5] - a[6]*a[4]*a[2];
    };
    
    /**
     * @function getInverse - computes an inverse of this matrix
     * @returns {Mat3} - inverse matrix
     */
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
    
    /**
     * @function print - prints out all elements of this matrix
     */
    Mat3.prototype.print = function() {
        for (var i = 0; i < 3; i++) {
            for (var j = 0; j < 3; j++) {
                console.log( this.elements[i*3 + j] );
            }
            console.log('\n');
        }
    };
    
    /**
     * @function translationMat - creates translation matrix
     * @param {Number} tx - translational x component
     * @param {Number} ty - translational y component
     * @returns {Mat3} a translated matrix 
     */
    function translationMat(tx, ty) {
        return new Mat3([
            1.0,    0.0,    0.0,
            0.0,    1.0,    0.0,
            tx||0,  ty||0,  1.0
        ]);
    }
    
    /**
     * @function rotationMat - creates 2d rotation matrix
     * @param {Number} alpha - translational x component
     * @returns {Mat3} a rotated matrix 
     */
    function rotationMat(alpha) {
        var c = Math.cos(alpha || 0),
            s = Math.sin(alpha || 0);
        return new Mat3([
            c,   s,   0.0, 
            -s,  c,   0.0,
            0.0, 0.0, 1.0
        ]);    
    }
    
    /**
     * @function scaleMat - creates 2d scale matrix
     * @param {Number} sx - scale x component
     * @param {Number} sy - scale y component
     * @returns {Mat3} a rotated matrix 
     */
    function scaleMat(sx, sy) {
        return new Mat3([
            sx||1,  0.0,    0.0,
            0.0,    sy||1,  0.0,
            0.0,    0.0,    1.0
        ]);
    }
    
    /**
     * @function isInCircle - checks wether vector v is inside or on the boundary of circle with center 'center' and radius 'R'
     * @param {Vec2} v - vector to check
     * @param {Vec2} center - center of circle
     * @param {Number} R - circle's radius 
     * @returns {Boolean} true if inside or on the boundary, false otherwise
     */
    function isInCircle(v, center, R) {	
        var dx = Math.pow(v.x - center.x, 2),
            dy = Math.pow(v.y - center.y, 2);					
        if ( dx + dy <= Math.pow(R, 2) ) {
            return true;
        }
        
        return false;
    }
    
    /**
     * @function isInTriangle - checks wether triangle contains vector v or not
     * @param {Object Array} points - array of triangle vertices
     * @param {Vec2} v - vector to check
     * @returns {Boolean} true if contains, false otherwise
     */
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
    
    /**
     * @function isInSegment - checks wether segment contains vector v or not
     * @param {Vec2} v - vector to check
     * @param {Vec2} v1 - segment begining vector (or point)
     * @param {Vec2} v2 - segment end vector (or point)
     * @returns {Boolean} true if contains, false otherwise
     */
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
    
    /**
     * @function getRandomInt - returns rand value between min and max
     * @param {Number} min - rand minimum value
     * @param {Number} max - rand maximum value
     * @returns {Number} random value
     */
    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    /**
     * @function getAngle - angle between 3 points
     * @param {Vec2} v1 - 1st point
     * @param {Vec2} v2 - 2nd point
     * @param {Vec2} v3 - 3rd point
     * @returns inner angle of (v2) in radians
     */
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
    
    /**
     * @function toWorldSpace - transforms from screen space to world space
     * @param {THREE.Vector3} point3D - transforming vector (point)
     * @param {Number} w - viewport width
     * @param {Number} h - viewport height
     * @param {THREE.Camera} camera - camera
     * @param {THREE.Matrix4} mat4 - helper matrix
     * @returns {THREE.Vector3} transformed to worldspace vector
     */
    function toWorldSpace(point2D, w, h, camera, mat4) {
        let x = 2 * point2D.x / w - 1;
        let y = 1 - 2 * point2D.y / h;        
        mat4.getInverse(mat4.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
        return new THREE.Vector3(x, y, 0).applyMatrix4(mat4);
    }
    
    /**
     * @function toClipSpace - transforms from screen space to clip space => -1 <= x <= 1, -1 <= y <= 1
     * @param {THREE.Vector2} point2D - transforming vector (point)
     * @param {Number} w - viewport width
     * @param {Number} h - viewport height
     * @param {THREE.Vector3} transformed to clip space vector
     */
    function toClipSpace(point2D, w, h, result) {
        let x = 2 * point2D.x / w - 1;
        let y = 1 - 2 * point2D.y / h;
        result.set(x, y, 0);
    }
    
    /**
     * @function getPickedObjects3D - returns 3D objects that contain mouseVector
     * @param {Object Array} objects - objects to search for interestions
     * @param {THREE.Camera} camera - camera
     * @param {THRE.Vector3} mouseVector - a vector to test for interesections
     * @returns {Object} object representing intersections with appripriate information
     */
    function getPickedObjects3D(objects, camera, mouseVector) {
        let raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouseVector, camera);
        return raycaster.intersectObjects(objects, true);
    }
    
    /**
     * @function planeThrou3Points - constructs plane by 3 points
     * @param {THREE.Vector3} v1 - 1st point
     * @param {THREE.Vector3} v2 - 2nd point
     * @param {THREE.Vector3} v3 - 3rd point
     * @returns {THREE.Mesh} a plane mesh through 3 points 
     */
    function planeThrou3Points(v1, v2, v3) {
        var planeGeom, planeMat, planeMesh;
        var normal = v2.clone().sub(v1).cross(v3.clone().sub(v2)).normalize();
        var center = v1.clone().add(v2).add(v3).multiplyScalar(1 / 3);
        
        planeGeom = new THREE.PlaneBufferGeometry(1500, 1500);
        planeMat = new THREE.MeshPhongMaterial({color: 0x9999a, side: THREE.DoubleSide, transparent: true, opacity: 0.4, depthTest: false});
        planeMesh = new THREE.Mesh(planeGeom, planeMat);            
        
        var orthoPlaneNormal = new THREE.Vector3(0, 0, 1);            
        var axis = normal.clone().cross(orthoPlaneNormal);
        var angle = Math.acos( normal.dot( orthoPlaneNormal ) );
        
        var rotationWorldMatrix = new THREE.Matrix4();
        rotationWorldMatrix.makeRotationAxis(axis.normalize(), -angle);
        planeMesh.matrix.multiply(rotationWorldMatrix);
        planeMesh.rotation.setFromRotationMatrix(planeMesh.matrix);
        planeMesh.position.set(center.x, center.y, center.z);
        
        return planeMesh;
    }
    
    /**
     * @function segment3D - constructs 3d segment by 2 points
     * @param {THREE.Vector3} v1 - 1st point
     * @param {THREE.Vector3} v2 - 2nd point
     * @returns {THREE.Line} a Line mesh through 2 points 
     */
    function segment3D(v1, v2) {
        let segmentGeometry = new THREE.Geometry();
        segmentGeometry.vertices.push(v1, v2);
        return new THREE.Line(segmentGeometry, new THREE.LineBasicMaterial( {color: 0x000000 } ));
    }
    
    /**
     * @function circle3D - constructs 3d circle
     * @param {Number} radius - circle radius
     * @param {THREE.Vector3} center - circle center
     * @returns {THREE.Line} a Line mesh through 2 points 
     */
    function circle3D(radius, center) {
        let circleGeometry = new THREE.CircleGeometry(radius, 64);
        circleGeometry.vertices.shift();    //  remove center
        let mat = new THREE.LineBasicMaterial({color: 0x000000 });
        let circle = new THREE.Line(circleGeometry, mat);
        circle.position.set(center.x, center.y, center.z);
        circle.rotation.set(Math.PI/2, 0, 0);
        return circle;
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
        toWorldSpace: toWorldSpace,
        toClipSpace: toClipSpace,
        getPickedObjects3D: getPickedObjects3D,
        planeThrou3Points: planeThrou3Points,
        segment3D: segment3D,
        circle3D: circle3D,
        point3DSize: point3DSize
    };

})(jQuery, THREE, DSSGeometry);