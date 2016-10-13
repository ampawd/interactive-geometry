"use strict";

// TODO:
// 1. Fix bug with Segment.prototype.contains method (sometimes returns false for fixed length
//    segments because of the condition Math.floor(a1 + a2) == Math.floor(this.length))

;(function($, THREE, Global) {
    
    let log = Global.utils.log,
        Vec2 = Global.math.Vec2,
        Vec3 = Global.math.Vec3,
        Mat2 = Global.math.Mat2,
        Mat3 = Global.math.Mat3,
        toWorldSpace = Global.math.toWorldSpace,
        radToDeg = Global.math.radToDeg,
        degToRad = Global.math.degToRad,
        getAngle = Global.math.getAngle,
        isInCircle = Global.math.isInCircle,
        isInSegment = Global.math.isInSegment,
        isInTriangle = Global.math.isInTriangle,
        translationMat = Global.math.translationMat,
        rotationMat = Global.math.rotationMat,
        scaleMat = Global.math.scaleMat,
        point3DSize = Global.math.point3DSize,
        getPropsCountOf = Global.utils.getPropsCountOf;
     
    /**
     * @class:       Shape
     * @author:      Aram Gevorgyan
     * @description: Abstract class Shape - defines common behavour for 2D geometry primitives
     */ 
    function Shape() {
        if (this.constructor === Shape) {
            throw("Can not instantiate an instance of abstract class");
        }
        
        /**
         * @property {String} className - name of the class, example: function Point() {...}, this.className === "Point" is true
         */        
        this.className = this.constructor.name;
        
        
        /**
         * @property {Object Array} points - an array of points that are wether on the boundary or neccesary for a render current shape
         */
        this.points = [];
        
        
        /**
         * @property {Object Map} connectedShapes - of shapes that share same points with this shape
         */
        this.connectedShapes = new Map();
        
        
        /**
         * @property {Object THREE.Object3D} container3 - stores 3d equivalents of 2d points and 2dshape itself
         */
        this.container3 = 0;
        
        
        /**
         * @property {Boolean} transformable - indicates wether the shape is transformable (rotatable, translatable, scalable)
         */
        this.transformable = true;
        
        
        /**
         * @property {Boolean} customTransformable - indicates wether the shape is customTransformable (transformable in a different way)
         */
        this.customTransformable = false;
        
        
        /**
         * @property {Boolean} translatable - indicates wether the shape is translatable
         */
        this.translatable = true;
        
        
        /**
         * @property {Boolean} rotatable - indicates wether the shape is rotatable
         */
        this.rotatable = true;
        
        
        /**
         * @property {Boolean} scalable - indicates wether the shape is scalable
         */
        this.scalable = true;
        
                
        /**
         * @property {Number} opacity - shape's opacity amount
         */
        this.opacity = 1.0;
        
        /**
         * @property {String} cnv2DOverlayContext - designations font style
         */
        this.cnv2DOverlayContext.font = "15px Arial";
                
        if (this.className !== "Text2d") {
            /**
             * @property {Object Array} advancedlines - stores Line shapes,
             * (bisector, parallel or perpendicular lines to on of the edges or any customly constructed edge for this shape)
             */
            this.advancedlines = [];
            
            
            /**
             * @property {Object Array} _2PointsIndexes - 2 dimensional array storing indexes of 2 points
             * to construct parallel or perpendicular line for one of the shape's edge
             */
            this._2PointsIndexes = [];
            
            
            /**
             * @property {Object Map} midpoints - stores all mid points of the shape in the form - { key: shapeID => value: [p1, p2, midP1_P2] }
             */
            this.midpoints = new Map();
            
            
            /**
             * @property {Object Map} distanceTextShapes - stores all Text2d shapes for displaying distance value of 2 points
             * { key: textShapeID => value: TextShape }
             */
            this.distanceTextShapes = new Map();
            
            
            /**
             * @property {Object Map} distancePoints - stores all points for those needs to compute the distance between them
             * { key: textShapeID => value: [point1, point2] }
             */
            this.distancePoints = new Map();
            
            
            /**
             * @property {Object Map} angleTextShapes - stores all Text2d shapes for displaying angle value of 3 points
             * { key: textShapeID => value: TextShape }
             */
            this.angleTextShapes = new Map();
            
            
            /**
             * @property {Object Map} anglePoints - stores all points for those needs to compute the inner angle of 3 points
             * { key: textShapeID => value: [point1, point2, point3] }
             */
            this.anglePoints = new Map();
            
            
            /**
             * @property {Boolean} boundaryContainsOtherPoints - indicates if this shape contains any point not from points array on his boundaries
             */
            this.boundaryContainsOtherPoints = false;
        }
        
        if (this.className === "Point") {
            /**
             * @property {Boolean} isMidPoint - indicates if this point is a midpoint of 2 other ones
             */
            this.isMidPoint = false;
            
            
            /**
             * @property {Boolean} isOnBoundary - indicates if this point lies on the boundary of any shape
             */
            this.isOnBoundary = false;
        }
    }
    
    
    /**
     * @property {Object Array} designations - stores english alphabet to designate points using any of letter
     */
    Shape.prototype.designations = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
    
    
    /**
     * @property {Number} nextLetterIndex - index of next letter in designations array
     */
    Shape.nextLetterIndex = 0;
    
    
    /**
     * @property {Number} letterIndexMark - if nextLetterIndex >= designations.length it gets increases to avoid duplicates for designation (letter), so A => A1, B => B1 etc
     */
    Shape.letterIndexMark = 0;
    
    
    /**
     * @property {Object Map } usedDesignations - stores designations (letters) that are already using { key: designations[i] => value : true or false }
     */
    Shape.prototype.usedDesignations = new Map();
    
    
    /**
     * @function createMeshFromThis - creates and returns new THREE.Mesh analog of this shape for displaying in 3D coord system
     */
    Shape.prototype.createMeshFromThis = function() {
        throw("Abstract method can't be called");
    };
    
    
    /**
     * @function transformIn_3D - transforms this shape in 3D coord system
     */
    Shape.prototype.transformIn_3D = function() {
        throw("Abstract method can't be called");
    };
    
    
    /**
     * @function attach - attaches shape to this and share points between them
     * @param {Object} shape - instance of any derived from Shape class, the shape that will be attached to this shape
     */
    Shape.prototype.attach = function(shape) {
        this.connectedShapes.set(shape.getID(), shape);
        for (let i = 0; i < shape.points.length; i++) {                
            for (let j = 0; j < this.points.length; j++) {
                if (shape.points[i].contains(this.points[j])) {
                    this.points[j] = shape.points[i]; 
                }
            }
        }
    };
    
    /**
     * @function detach - detaches shape from this shape
     * @param {String} id - id of the shape to detach
     */
    Shape.prototype.detach = function(id) {
       this.connectedShapes.delete(id);
    };
    
    
    /**
     * @function transformConnectedShapes - transforms shapes connected to this shape, keeping also transformed bisector, parallel and perpendicular lines and midpoints
     * @param {Vec2} mdown - 2d vector stores mouse coordinates when mouse pressed
     * @param {Vec2} mmove - 2d vector stores mouse coordinates when mouse moving
     */
    Shape.prototype.transformConnectedShapes = function(mdown, mmove) {
        if (this.connectedShapes.size === 1) {
            return;
        }
        for (let i = 0, prop; i < this.points.length; i++) {
            let getProp = true;
            for (let entry of this.connectedShapes) {    
                for (let j = 0; j < entry[1].points.length; j++) {
                    if (this.points[i].contains(entry[1].points[j]) && this.points[i] != entry[1].points[j]) {
                        getProp = false;
                    }
                }
            }
            if (getProp) {
                prop = this.geometryEngine.getShapesGroupTransformProps(this.points[i], false, this.connectedShapes);
                for (let id in prop) {
                    if (id !== this.getID()) {
                        if (this.connectedShapes.has(id)) {
                            this.connectedShapes.get(id).transform(prop[id], mdown, this.points[i]);        
                            this.connectedShapes.get(id).advancedTransform(mdown, this.points[i]);
                            this.connectedShapes.get(id).updateMidPoints(mdown, this.points[i]);
                        }
                    }
                }
            }
        }
    };
    
    
    /**
     * @function advancedTransform - transforms only bisector, parallel and perpendicular lines of this shape and connected ones
     * @param {Vec2} mdown - 2d vector stores mouse coordinates when mouse pressed
     * @param {Vec2} mmove - 2d vector stores mouse coordinates when mouse moving
     */
    Shape.prototype.advancedTransform = function(mdown, mmove) {
        let _this = this;
        _this.transformPrlPrpnBisLines(mdown, mmove);
        _this.connectedShapes.forEach(function(sh, id) {
            sh.transformPrlPrpnBisLines(mdown, mmove);
        });
    };
    
    
    /**
     * @function updateMidPoints - keeps mid points as mid points when tranforming and keeps transforming appropriate shapes as well
     * @param {Vec2} mdown - 2d vector stores mouse coordinates when mouse pressed
     * @param {Vec2} mmove - 2d vector stores mouse coordinates when mouse moving
     */
    Shape.prototype.updateMidPoints = function(mdown, mmove) {
        let mid, temp, prop;
        if (this.className === "Text2d") {
            return;
        }
        for (let entry of this.midpoints) {
            mid = entry[1][2];
            temp = entry[1][0].add(entry[1][1]).multScalar(0.5);
            mid.set(temp.x, temp.y);
            mid.transformIn_3D();
            prop = this.geometryEngine.getShapesGroupTransformProps(mid, false, mid.connectedShapes);
            for (let id in prop) {
                if (id !== this.getID()) {
                    if (mid.connectedShapes.has(id)) {
                        mid.connectedShapes.get(id).transform(prop[id], mdown, mid);
                    }
                }
            }
            entry[1][2].updateMidPoints(mdown, mmove);
        }
    };
    
    
    /**
     * @function transformPrlPrpnBisLines - transforms only bisector parallel and perpendicular lines of this shape
     * @param {Vec2} mdown - 2d vector stores mouse coordinates when mouse pressed
     * @param {Vec2} mmove - 2d vector stores mouse coordinates when mouse moving
     */
    Shape.prototype.transformPrlPrpnBisLines = function(mdown, mmove) {
        let _this = this, v1, shape, lambda = this.cnvW + this.cnvH, det = 0, alpha = 0;
        if (!this.advancedlines) { return; }
        this.advancedlines.forEach(function(val, i) {
            v1 = val[0]; shape = val[1];
            if (shape.bisector) {
                let points = val[0];
                shape.points[0].set(points[1].x, points[1].y);
                shape.points[1].set(points[2].x, points[2].y);               
                shape.points[2].set(points[2].x - lambda*(points[2].x - points[1].x), points[2].y - lambda*(points[2].y - points[1].y));						
                shape.points[3].set(points[2].x + lambda*(points[2].x - points[1].x), points[2].y + lambda*(points[2].y - points[1].y));                            
                det = (points[2].x - points[0].x)*(points[1].y - points[0].y) - (points[1].x - points[0].x)*(points[2].y - points[0].y);                            
                alpha = 0;                
                if (det >= 0) {
                    alpha = -getAngle(points[0], points[1], points[2]);
                } else {
                    alpha = getAngle(points[0], points[1], points[2]);
                }
                shape.rotate(shape.points[0].toVec2(), alpha/2);
                shape.transformIn_3D();
            }
            if (shape.parallel || shape.perpendicular) {
                v1.set(shape.points[0].x, shape.points[0].y);
                if (!_this._2PointsIndexes[i]) {
                    return;
                }
                let p1 = _this._2PointsIndexes[i][0],
                    p2 = _this._2PointsIndexes[i][1],
                    b = p2.sub(p1),
                    l = b.length(),
                    v2 = v1.copy(),
                    pp1 = v1.copy(),
                    pp2 = new Vec2(v1.x + b.x, v1.y + b.y);
                v2.set(v1.x + lambda*b.x, v1.y + lambda*b.y);
                v1.set(v1.x - lambda*b.x, v1.y - lambda*b.y);
                
                shape.points[0].set(pp1.x, pp1.y);
                shape.points[1].set(pp2.x, pp2.y);
                shape.points[2].set(v2.x, v2.y);
                shape.points[3].set(v1.x, v1.y);
                if (shape.perpendicular) {
                    shape.rotate(pp1, Math.PI * 0.5);
                }   
                            
                shape.transformIn_3D();
            }
            
            shape.transformPrlPrpnBisLines(mdown, mmove);
            shape.updateMidPoints(mdown, mmove);
        });
    };
    
    
    /**
     * @function updateDistanceTexts - updates text value of 2 points distances for this shape and mid points
     */
    Shape.prototype.updateDistanceTexts = function() {
        let points = this.points, distancePoints, midPoint;
        for (let entry of this.distanceTextShapes) {
            distancePoints = this.distancePoints.get(entry[0]);
            entry[1].text = distancePoints[1].sub(distancePoints[0]).length().toFixed(2);
            midPoint = distancePoints[0].add(distancePoints[1]).multScalar(0.5).add(new Vec2(0, -15));
            entry[1].translate(midPoint);
        }
        this.midpoints.forEach(function(value) {
            value[2].updateDistanceTexts();
        });
    };
    
    
    /**
     * @function updateAngleTexts - updates text value of 3 points angle for this shape and mid points
     */
    Shape.prototype.updateAngleTexts = function() {
        let points = this.points, anglePoints;
        for (let entry of this.angleTextShapes) {
            anglePoints = this.anglePoints.get(entry[0]);
            entry[1].text = (getAngle( anglePoints[0], anglePoints[1], anglePoints[2]) * radToDeg).toFixed(2);
            entry[1].translate(anglePoints[1].multScalar(1.02));
        }
        this.midpoints.forEach(function(value) {
            value[2].updateAngleTexts();
        });
    };
    
    
    /**
     * @function updateMeasureTexts - updates all text values (ether angle text or distance text)
     */
    Shape.prototype.updateMeasureTexts = function() {
        this.updateDistanceTexts();
        this.updateAngleTexts();
    };
    
    
    /**
     * @function setOpacity - sets opacity value for this shape
     * @param {Number} value - opacity amount, 0 <= value <= 1
     */
    Shape.prototype.setOpacity = function(value) {
        this.opacity = value;
        if (this.container3) {            
            if (this.className !== "Text2d" && this.className !== "Vector") {   //  vector opacity can't be updated
                this.container3.getObjectByName("child" + this.getID()).material.transparent = true;    
                this.container3.getObjectByName("child" + this.getID()).material.opacity = value;
            }
        }
        if (this.className == "Point") {
            let p = this.scene.getObjectByName(this.getID());
            if (p) {
                p.material.transparent = true;
                p.material.opacity = value;    
            }
        }
    };
    
    
    /**
     * @function getOpacity - gets opacity value for this shape
     * @returns {Number} opacity - opacity amount, 0 <= opacity <= 1
     */
    Shape.prototype.getOpacity = function() {
        return this.opacity;
    };
    
    
    /**
     * @function createLetters - create letters on points for this shape
     */
    Shape.prototype.createLetters = function() {
        if (Shape.nextLetterIndex >= this.designations.length) {
            Shape.nextLetterIndex = 0;
            Shape.letterIndexMark++;
        }
        for (let i = 0; i < this.points.length; i++) {
            if (this.points[i].isVisible && !this.points[i].hasLetter()) {
                let letter = this.designations[Shape.nextLetterIndex++];
                this.usedDesignations.set(letter, true);
                this.points[i].setLetter( letter + (Shape.letterIndexMark ? Shape.letterIndexMark : "") );       
            }
        }
    };
    
    
    /**
     * @function projectAndDrawLetters - projects 3D point to 2D and render letters on a 2dOverlayCanvas
     */
    Shape.prototype.projectAndDrawLetters = function() {
        throw("Abstract method can't be called");  
    };
    
    
    /**
     * @function updateBoundaryPoints - keeps boundary points of this shape on the boundary
     */
    Shape.prototype.updateBoundaryPoints = function() {
        //throw("Abstract method can't be called");  
    };
    
    
    /**
     * @function setRenderAttribs - sets render attribs such as fill color, stroke style, line width etc
     * @param {Object} attr - plain javascript object, contains all attributes 
     */
    Shape.prototype.setRenderAttribs = function(attr) {
        throw("Abstract method can't be called");
    }; 
    
    
    /**
     * @function getFillColor - returns fill color of this shape as a string 
     * @returns {String} fillColor - color which is used to fill the shape (if its fillable)
     */
    Shape.prototype.getFillColor = function() {        
        throw("Abstract method can't be called");
    };
    
    
    /**
     * @function copy - returns copy of this shape
     * @returns {Object Shape} - copy of this shape (not implemented for most shapes)
     */
    Shape.prototype.copy = function() {
        throw("Abstract method can't be called");
    };
    
    
    /**
     * @function transform - transforms this shape based on transformProps object info passed to this
     * @param {Object} transformProps - plain javascript hash pobject, stores all transformation information (user actions with the shape when clicking on canvas) in shapesGroup
     * @param {Vec2} mdown - 2d vector stores mouse coordinates when mouse pressed
     * @param {Vec2} mmove - 2d vector stores mouse coordinates when mouse moving
     */
    Shape.prototype.transform = function(transformProps, mdown, mmove) {
        throw("Abstract method can't be called");
    };
    
    
    /**
     * @function render - renders this shape and if neccesary the parts of it
     */
    Shape.prototype.render = function() {
        throw("Abstract method can't be called");
    };
    
    
    /**
     * @function contains - checks if point contained in this shape (wether inside on the boundary or both)
     * @param {Point} p - instance of a base class Shape (but in this case must be Point)
     * @returns {Boolean} true if contains false otherwise
     */
    Shape.prototype.contains = function(p) {
        throw("Abstract method can't be called");
    };
    
    
    /**
     * @function boundaryContains - checks if point only is on the boundary of this shape
     * @param {Point} v - instance of a base class Shape (but in this case must be Point)
     * @returns {Boolean} true if boundary contains, false otherwise
     */
    Shape.prototype.boundaryContains = function(v) {
        throw("Abstract method can't be called");
    };
    
    
    /**
     * @function pointsHave - checks if point only is on the points in the shape
     * @param {Point} v - instance of a base class Shape (but in this case must be Point)
     * @returns {Boolean} true if any of the shapes' point contains, false otherwise
     */
    Shape.prototype.pointsHave = function(p) {
        throw("Abstract method can't be called");
    };
    
    
    /**
     * @function rotate - rotates the shape on a 2d plane by alpha radians around vector v
     * @param {Vec2} v - rotation vector
     * @param {Number} alpha - rotation angle in radians
     */
    Shape.prototype.rotate = function(v, alpha) {
        throw("Abstract method can't be called");
    };
    
    
    /**
     * @function translate - translates the shape by a vector v
     * @param {Vec2} v - translation vector
     */
    Shape.prototype.translate = function(v) {
        throw("Abstract method can't be called");
    };
    
    
    /**
     * @function scale - scales the shape by a vector v
     * @param {Vec2} v - scale vector
     */
    Shape.prototype.scale = function(v) {
        throw("Abstract method can't be called");
    };
    
    
    /**
     * @function setBoundaryWidth - sets boundary width of this shape (can be linewidth or point size)
     * @param {Number} value - boundary width value
     */
    Shape.prototype.setBoundaryWidth = function(value) {
        throw("Abstract method can't be called");
    };
    
    
    /**
     * @function getBoundaryWidth - returns boundary width of this shape (can be linewidth or point size)
     * @returns {Number} - linewidth or radius (if the shape is point)  
     */
    Shape.prototype.getBoundaryWidth = function() {
        throw("Abstract method can't be called");
    };
    
    /**
     * @constructor Line - infinity line
     * @param {Vec2} v1 - infinity point 1
     * @param {Vec2} v2 - infinity point 2
     * @param {Vec2} p1 - 1st visible point on the line
     * @param {Vec2} p2 - 2nd visible point on the line
     * @param {String} sideColor - side color
     * @param {Number} linewidth - line width
     */
    function Line(v1, v2, p1, p2, sideColor, lineWidth) {
        Shape.call(this);
        this.points.push(new Point(p1 || new Vec2(), 2, "#000"));
        this.points.push(new Point(p2 || new Vec2(), 2, "#000"));
        this.points.push(new Point(v1 || new Vec2(), 2, "#000"));
        this.points.push(new Point(v2 || new Vec2(), 2, "#000"));
        this.points[2].isVisible = false;
        this.points[3].isVisible = false;
        this.perpendicular = false;
        this.parallel = false;
        this.bisector = false;
        this.color = sideColor || "#000";
        this.lineWidth = lineWidth || 0;
    }

    Line.count = 0;
    Line.prototype = Object.create(Shape.prototype);
    Line.prototype.constructor = Line;    

    Line.prototype.copy = function() {
        let _copyOfThis = new Line( this.points[2].toVec2(), this.points[3].toVec2(),
                                    this.points[0].toVec2(), this.points[1].toVec2(),
                                    this.color.slice(),      this.lineWidth  );
        
        for (let entry of this.connectedShapes) {
            if (entry[1].getID() !== this.getID() && entry[1].className !== "Line") {
                _copyOfThis.attach(entry[1].copy());
            } else {
                if (entry[1].getID() === this.getID()) {
                    _copyOfThis.attach(_copyOfThis);
                } else {
                    _copyOfThis.attach(new Line(entry[1].points[2].toVec2(), entry[1].points[3].toVec2(),
                                                entry[1].points[0].toVec2(), entry[1].points[1].toVec2(),
                                                entry[1].color.slice(),      entry[1].lineWidth ));
                }
            }
        }
        return _copyOfThis;
    };
    
    Line.prototype.getID = function() {
        if (!this.ID) {
            Line.count++;
            this.ID = "line" + Line.count;   
        }
        return this.ID;
    };
    
    Line.prototype.setRenderAttribs = function(attrs) {
        if (getPropsCountOf(attrs) == 0) {
            return;
        }
        
        this.color = attrs.strokeStyle;
        if (this.container3) {
            this.container3.getObjectByName("child" + this.getID()).material.color.set(this.color); 
        }
    };
    
    Line.prototype.getFillColor = function() {        
        return this.color;
    };
    
    Line.prototype.setBoundaryWidth = function(value) {
        this.lineWidth = value;
    };
    
    Line.prototype.getBoundaryWidth = function() {
        return this.lineWidth;
    };
    
    Line.prototype.projectAndDrawLetters = function() {
		if (!this.container3) {
            return;
        }        
        var p1 = this.container3.getObjectByName(this.points[0].getID());
        var p2 = this.container3.getObjectByName(this.points[1].getID());
        if (p1 && p2) { 
            let pos = toScreenXY(p1.position, this.cnvW, this.cnvH, this.camera);       
            this.cnv2DOverlayContext.fillText(this.points[0].getLetter(), pos.x, pos.y - 5);
            pos = toScreenXY(p2.position, this.cnvW, this.cnvH, this.camera);
            this.cnv2DOverlayContext.fillText(this.points[1].getLetter(), pos.x, pos.y - 5 );   
        }
    };
    
    Line.prototype.createMeshFromThis = function() {
        let lineGeometry = new THREE.Geometry(),
            lineMaterial,
            lineMesh, parent;
        parent = new THREE.Object3D();
        lineGeometry.vertices.push(new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2));
        lineGeometry.vertices.push(new THREE.Vector3(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2));
        lineGeometry.vertices.push(new THREE.Vector3(this.points[2].x - this.cnvW/2, 0, this.points[2].y - this.cnvH/2));
        lineGeometry.vertices.push(new THREE.Vector3(this.points[3].x - this.cnvW/2, 0, this.points[3].y - this.cnvH/2));  
        lineMaterial = new THREE.LineBasicMaterial({color: new THREE.Color(this.color).getHex()});
        lineMesh = new THREE.Line(lineGeometry, lineMaterial);
        lineMesh.name = "child" + this.getID();

        let p1 = createPoint3D(point3DSize, new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2));
        let p2 = createPoint3D(point3DSize, new THREE.Vector3(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2));       
        
        p1.name = this.points[0].getID();
        p2.name = this.points[1].getID();
        parent.add(p1); parent.add(p2);
        parent.add(lineMesh);
        parent.name = this.getID();   
        this.container3 = parent;
        this.scene.add(parent);
        return parent;
    };
    
    Line.prototype.transformIn_3D = function() {
        if (!this.container3) {
            return;
        }
        let sh = this.container3.getObjectByName("child" + this.getID());
        let p1 = this.container3.getObjectByName(this.points[0].getID());
        let p2 = this.container3.getObjectByName(this.points[1].getID());
        for (let i = 0; i < sh.geometry.vertices.length; i++) {
            sh.geometry.vertices[i].x = this.points[i].x - this.cnvW/2;
            sh.geometry.vertices[i].z = this.points[i].y - this.cnvH/2;
        }
        p1.position.set(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2);
        p2.position.set(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2);        
        sh.geometry.verticesNeedUpdate = true;
    }
    
    Line.prototype.render = function() {
        let points = this.points;
        let ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth;
        ctx.moveTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);    
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
        if (points[0]) {
            points[0].render();
        }
        if (points[1]) {
            points[1].render();
        }
        this.projectAndDrawLetters();
    };
    
    Line.prototype.pointsHave = function(transformProps, p) {
        let points = this.points;
        let id = this.getID();
        if (points[0].contains(p)) {
            transformProps[id] = {};
            transformProps[id].prevp2 = points[1].copy();
            transformProps[id].p1 = 1;
            return true;
        }
        if (points[1].contains(p)) {
            transformProps[id] = {};
            transformProps[id].prevp1 = points[0].copy();
            transformProps[id].p2 = 1;
            return true;
        }
        return false;
    };
    
    Line.prototype.transform = function(transformProps, mdown, mmove) {
        if (!this.transformable) {
            return;
        }
        let lambda = this.cnvW + this.cnvH, points = this.points;
        let prevp1 = transformProps.prevp1, prevp2 = transformProps.prevp2;
        if (this.rotatable && transformProps.p1) {
            if (points[0].isOnBoundary) {
                points[2].set(points[1].x + lambda*(points[1].x - points[0].x), points[1].y + lambda*(points[1].y - points[0].y));
                points[3].set(points[1].x - lambda*(points[1].x - points[0].x), points[1].y - lambda*(points[1].y - points[0].y));     
            } else {
                points[0].set(mmove.x, mmove.y);
                points[2].set(mmove.x - lambda*(mmove.x - prevp2.x), mmove.y - lambda*(mmove.y - prevp2.y));
                points[3].set(mmove.x + lambda*(mmove.x - prevp2.x), mmove.y + lambda*(mmove.y - prevp2.y)); 
            }  
        }
        if (this.rotatable && transformProps.p2) {
            if (points[1].isOnBoundary) {
                points[2].set(points[1].x + lambda*(points[1].x - points[0].x), points[1].y + lambda*(points[1].y - points[0].y));
                points[3].set(points[1].x - lambda*(points[1].x - points[0].x), points[1].y - lambda*(points[1].y - points[0].y));   
            } else {
                points[1].set(mmove.x, mmove.y);
                points[2].set(mmove.x + lambda*(mmove.x - prevp1.x), mmove.y + lambda*(mmove.y - prevp1.y));
                points[3].set(mmove.x - lambda*(mmove.x - prevp1.x), mmove.y - lambda*(mmove.y - prevp1.y));
            }            
        }
        this.updateBoundaryPoints();
        if (this.translatable && transformProps.translating) {
            let diff = mmove.sub(mdown);
            this.translate(diff);
            mdown.set(mmove.x, mmove.y);
        }       
        
        this.transformIn_3D();
        this.updateMeasureTexts();
    };
    
    Line.prototype.updateBoundaryPoints = function() {
        let points = this.points;
        //let l = points[1].sub(points[0]).length();
        //let l = 1;
        //
        //let p0 = this.points[0]
        //let p1 = this.points[1];
        //
        //for (let i = 4; i < points.length; i++) {
        //    this.points[i].set( p0.x - l * (p1.x - p0.x), p0.y - l * (p1.y - p0.y) );                
        //}
    };
    
    Line.prototype.contains = function(v) {
        let points = this.points;
        if (this.points[0].contains(this.points[1])) {
            return false;
        }
        let det = new Mat2([
                         v.x - points[0].x, points[1].x - points[0].x,
                         v.y - points[0].y, points[1].y - points[0].y]).determinant(),
        
            l = points[1].sub(points[0]).length(),
            eps = l > 200 ? 1500 : l * 4;
        return Math.abs(det) < l + eps;
    };
    
    Line.prototype.boundaryContains = function(boundarySegmentIndexes, v) {
        if (this.contains(v)) {
            boundarySegmentIndexes.push(0);
            boundarySegmentIndexes.push(1);
            return true;
        }
        return false;
    };
    
    Line.prototype.translate = function(v) {
        let points = this.points;
        for (let i = 0; i < points.length; i++) {
            points[i].set(points[i].x + v.x, points[i].y + v.y);
        }
    };
    
    Line.prototype.rotate = function(v, alpha) {
        let points = this.points;
        this.translate(v.multScalar(-1));
        for (let i = 0; i < points.length; i++) {
            points[i].rotate(alpha);
        }
        this.translate(v);
    };
    
    
    /**
     * @constructor Ray - 2d ray shape on a plane
     * @param {Vec2} v1 - point the ray starts from
     * @param {Vec2} v2 - point of the ray infinity
     * @param {Vec2} p2 - second point on the ray
     * @param {String} sideColor - side color
     * @param {Number} linewidth - line width
     */
    function Ray(v1, v2, p2, sideColor, lineWidth) {
        Shape.call(this);    
        this.points.push(new Point(v1 || new Vec2(), 2, "#000"));
        this.points.push(new Point(v2 || new Vec2(), 2, "#000"));
        this.points.push(new Point(p2 || new Vec2(), 2, "#000")); 
        this.color = sideColor || "#000";
        this.lineWidth = lineWidth || 0;
    }
    
    Ray.count = 0;
    Ray.prototype = Object.create(Shape.prototype);
    Ray.prototype.constructor = Ray;
    
    Ray.prototype.getID = function() {
        if (!this.ID) {
            Ray.count++;
            this.ID = "ray" + Ray.count;   
        }
        return this.ID;
    };
    
    Ray.prototype.setRenderAttribs = function(attrs) {
        if (getPropsCountOf(attrs) == 0) {
            return;
        }
        
        this.color = attrs.strokeStyle;
        if (this.container3) {
            this.container3.getObjectByName("child" + this.getID()).material.color.set(this.color); 
        }
    };
    
    Ray.prototype.getFillColor = function() {        
        return this.color;
    };
    
    Ray.prototype.setBoundaryWidth = function(value) {
        this.lineWidth = value;
    };
    
    Ray.prototype.getBoundaryWidth = function() {
        return this.lineWidth;
    };
    
    Ray.prototype.projectAndDrawLetters = function() {
        if (!this.container3) {
            return;
        }
        var p1 = this.container3.getObjectByName(this.points[0].getID());
        var p2 = this.container3.getObjectByName(this.points[2].getID());
        let pos = toScreenXY(p1.position, this.cnvW, this.cnvH, this.camera);
        this.cnv2DOverlayContext.fillText(this.points[0].getLetter(), pos.x, pos.y - 5);
        pos = toScreenXY(p2.position, this.cnvW, this.cnvH, this.camera);
        this.cnv2DOverlayContext.fillText(this.points[2].getLetter(), pos.x, pos.y - 5);
    };
    
    Ray.prototype.createMeshFromThis = function() {
        let rayGeometry = new THREE.Geometry(),
            rayMaterial,
            rayMesh, parent;
        rayGeometry.vertices.push(new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2));
        rayGeometry.vertices.push(new THREE.Vector3(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2));        
        rayMaterial = new THREE.LineBasicMaterial({color: new THREE.Color(this.color).getHex() });
        rayMesh = new THREE.Line(rayGeometry, rayMaterial);
        parent = new THREE.Object3D();
        parent.add(rayMesh);
        rayMesh.name = "child" + this.getID();
        let p1 = createPoint3D(point3DSize, new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2));
        let p2 = createPoint3D(point3DSize, new THREE.Vector3(this.points[2].x - this.cnvW/2, 0, this.points[2].y - this.cnvH/2));
        p1.name = this.points[0].getID();
        p2.name = this.points[2].getID();
        parent.add(p1); parent.add(p2);
        parent.name = this.getID();
        this.container3 = parent;
        this.scene.add(parent);
        return parent;
    };
    
    Ray.prototype.render = function() {
        let points = this.points;
        let ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth;
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);    
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
        if (points[0]) {
            points[0].render();
        }
        if (points[2]) {
            points[2].render();
        }
        this.projectAndDrawLetters();
    };
    
    Ray.prototype.pointsHave = function(transformProps, p) {
        let id = this.getID();
        if (this.points[0].contains(p)) {
            transformProps[id] = {};
            transformProps[id].prevp2 = this.points[2].copy();
            transformProps[id].v1 = 1;
            return true;
        }
        if (this.points[2].contains(p)) {
            transformProps[id] = {};
            transformProps[id].prevp1 = this.points[0].copy();
            transformProps[id].p2 = 1;
            return true;
        }
        return false;
    };
    
    Ray.prototype.transform = function(transformProps, mdown, mmove) {
        if (!this.transformable) {
            return;
        }
        let points = this.points;
        let lambda = this.cnvW + this.cnvH;
        let prevp1 = transformProps.prevp1, prevp2 = transformProps.prevp2;
        if (transformProps.v1) {
            if (points[0].isOnBoundary) {
                points[1].set(points[0].x - lambda*(points[0].x - prevp2.x), points[0].y - lambda*(points[0].y - prevp2.y));
            } else {
                points[0].set(mmove.x, mmove.y);
                points[1].set(mmove.x - lambda*(mmove.x - prevp2.x), mmove.y - lambda*(mmove.y - prevp2.y));
            }
        }
        if (transformProps.p2) {
            if (points[2].isOnBoundary) {
                points[1].set(points[2].x + lambda*(points[2].x - points[0].x), points[2].y + lambda*(points[2].y - points[0].y));    
            } else {
                points[2].set(mmove.x, mmove.y);
                points[1].set(mmove.x + lambda*(mmove.x - prevp1.x), mmove.y + lambda*(mmove.y - prevp1.y));   
            }
        }
        this.updateBoundaryPoints();
        if (this.translatable && transformProps.translating) {
            let diff = mmove.sub(mdown);										
            this.translate(diff);
            mdown.set(mmove.x, mmove.y);
        }
        this.transformIn_3D();
        this.updateMeasureTexts();
    };
    
    Ray.prototype.updateBoundaryPoints = function() {
        //let points = this.points;        
    };
    
    Ray.prototype.transformIn_3D = function() {
        if (!this.container3) {
            return;
        }
        let sh = this.container3.getObjectByName("child" + this.getID());
        let p1 = this.container3.getObjectByName(this.points[0].getID());
        let p2 = this.container3.getObjectByName(this.points[2].getID());
        for (let i = 0; i < sh.geometry.vertices.length; i++) {
            sh.geometry.vertices[i].x = this.points[i].x - this.cnvW/2;
            sh.geometry.vertices[i].z = this.points[i].y - this.cnvH/2;
        }
        p1.position.set(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2);
        p2.position.set(this.points[2].x - this.cnvW/2, 0, this.points[2].y - this.cnvH/2);
        sh.geometry.verticesNeedUpdate = true;
    };
    
    Ray.prototype.contains = function(v) {
        let points = this.points;
        let a1 = v.sub(points[0]).length();
        let a2 = v.sub(points[1]).length();
        let length = points[1].sub(points[0]).length();
        if (this.points[0].contains(this.points[2])) {
            return false;
        }
        let det = new Mat2([
                         v.x - points[0].x, points[2].x - points[0].x,
                         v.y - points[0].y, points[2].y - points[0].y]).determinant();
        
        return Math.abs(det) < 2000 && Math.floor(a1 + a2) == Math.floor(length);
    };
    
    Ray.prototype.boundaryContains = function(boundarySegmentIndexes, v) {
        if (this.contains(v)) {
            boundarySegmentIndexes.push(0);
            boundarySegmentIndexes.push(2);
            return true;
        }
        return false;
    };
    
    Ray.prototype.translate = function(v) {
        let points = this.points;
        for (let i = 0; i < points.length; i++) {
            points[i].set(points[i].x + v.x, points[i].y + v.y);
        }
    };
    
    Ray.prototype.rotate = function(v, alpha) {
        let points = this.points;
        this.translate(v.multScalar(-1));
        for (let i = 0; i < points.length; i++) {
            points[i].rotate(alpha);
        }
        this.translate(v);
    };
    
    
    /**
     * @constructor Segment - 2d segment shape on a plane
     * @param {Vec2} v1 - start point
     * @param {Vec2} v2 - end point
     * @param {String} sideColor - side color
     * @param {Number} linewidth - line width
     */
    function Segment(v1, v2, sideColor, lineWidth) {
        Shape.call(this);
        this.points.push(new Point(v1 || new Vec2(), 2, "#000"));
        this.points.push(new Point(v2 || new Vec2(), 2, "#000"));
        this.color = sideColor || "#000";
        this.lineWidth = lineWidth || 0;
        this.length = v2.sub(v1).length();
        this.fixedLength = false;
    }
    
    Segment.count = 0;
    Segment.prototype = Object.create(Shape.prototype);
    Segment.prototype.constructor = Segment;
    
    Segment.prototype.getID = function() {
        if (!this.ID) {
            Segment.count++;
            this.ID = "segment" + Segment.count;   
        }
        return this.ID;
    };
    
    Segment.prototype.length = function() {
        return this.points[1].sub(this.points[0]).length();   
    };
    
    Segment.prototype.setRenderAttribs = function(attrs) {
        if (getPropsCountOf(attrs) == 0) {
            return;
        }
        
        this.color = attrs.strokeStyle;
        if (this.container3) {
            this.container3.getObjectByName("child" + this.getID()).material.color.set(this.color); 
        }
    };
    
    Segment.prototype.getFillColor = function() {        
        return this.color;
    };
    
    Segment.prototype.setBoundaryWidth = function(value) {
        this.lineWidth = value;
    };
    
    Segment.prototype.getBoundaryWidth = function() {
        return this.lineWidth;
    };
    
    Segment.prototype.pointsHave = function(transformProps, p) {
        let points = this.points;
        let id = this.getID();
        if (points[0].contains(p)) {
            transformProps[id] = {};
            transformProps[id].v1 = 1;
            return true;        
        }
        if (points[1].contains(p)) {
            transformProps[id] = {};
            transformProps[id].v2 = 1;
            return true;
        }
        return false;
    };
    
    Segment.prototype.transform = function(transformProps, mdown, mmove) {
        let points = this.points;
        if (!this.transformable) {
            return;
        }
        if (!this.customTransformable) {
            if (transformProps.v1) {
                points[0].set(mmove.x, mmove.y);				
            }
            if (transformProps.v2) {
                points[1].set(mmove.x, mmove.y);
            }
        } else {
            
        }
        
        this.updateBoundaryPoints();
        if (this.translatable && transformProps.translating) {
            let diff = mmove.sub(mdown);
            this.translate(diff);
            mdown.set(mmove.x, mmove.y);
        }
        this.transformIn_3D();
        this.updateMeasureTexts();
    };
    
    Segment.prototype.updateBoundaryPoints = function() {
        //let points = this.points;
        //let l = 1;        
        //let p0 = this.points[0]
        //let p1 = this.points[2];        
        //for (let i = 2; i < points.length; i++) {
        //    this.points[i].set( p0.x - l * (p1.x - p0.x), p0.y - l * (p1.y - p0.y) );                
        //}
    };
    
    Segment.prototype.transformIn_3D = function() {
        if (!this.container3) {
            return;
        }
        let sh = this.container3.getObjectByName("child" + this.getID());
        let p1 = this.container3.getObjectByName(this.points[0].getID());
        let p2 = this.container3.getObjectByName(this.points[1].getID());
        for (let i = 0; i < sh.geometry.vertices.length; i++) {
            sh.geometry.vertices[i].x = this.points[i].x - this.cnvW/2;
            sh.geometry.vertices[i].z = this.points[i].y - this.cnvH/2;
        }
        p1.position.set(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2);
        p2.position.set(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2);
        sh.geometry.verticesNeedUpdate = true;
    };
    
    Segment.prototype.contains = function(v) {
        let points = this.points;
        let a1 = (v.sub(points[0]).length());
        let a2 = (v.sub(points[1]).length());
        this.length = points[1].sub(points[0]).length();
        let det = Math.abs(
                        (new Mat2([
                         v.x - points[0].x, points[1].x - points[0].x,
                         v.y - points[0].y, points[1].y - points[0].y])).determinant()
                        );
        
        //log((det < 2000).toString(), (Math.floor(a1 + a2) == Math.floor(this.length)).toString());
        return det < 2000 && Math.floor(a1 + a2) == Math.floor(this.length);
    };
    
    Segment.prototype.translate = function(v) {
        let points = this.points;
        for (let i = 0; i < points.length; i++) {
            points[i].set(points[i].x + v.x, points[i].y + v.y);
        }
    };
    
    Segment.prototype.rotate = function(v, alpha) {
        let points = this.points;
        this.translate(v.multScalar(-1));   //  translate to origin
        for (let i = 0; i < points.length; i++) {
            points[i].rotate(alpha);        //  rotate around origin
        }
        this.translate(v);                  //  translate back to original position
    };
    
    Segment.prototype.projectAndDrawLetters = function() {
        if (!this.container3) {
            return;
        }
        var p1 = this.container3.getObjectByName(this.points[0].getID());
        var p2 = this.container3.getObjectByName(this.points[1].getID());
        let pos = toScreenXY(p1.position, this.cnvW, this.cnvH, this.camera);
        this.cnv2DOverlayContext.fillText(this.points[0].getLetter(), pos.x, pos.y - 5);
        pos = toScreenXY(p2.position, this.cnvW, this.cnvH, this.camera);
        this.cnv2DOverlayContext.fillText(this.points[1].getLetter(), pos.x, pos.y - 5 );
    };
    
    Segment.prototype.createMeshFromThis = function() {
        let segmentGeometry = new THREE.Geometry(),
            segmentMaterial,
            segmentMesh, parent;
        segmentGeometry.vertices.push(new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2));
        segmentGeometry.vertices.push(new THREE.Vector3(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2));        
        segmentMaterial = new THREE.LineBasicMaterial( {color: new THREE.Color(this.color).getHex() } );
        segmentMesh = new THREE.Line(segmentGeometry, segmentMaterial);
        segmentMesh.name = "child" + this.getID();
        parent = new THREE.Object3D();
        parent.add(segmentMesh);
        let p1 = createPoint3D(point3DSize, new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2));
        let p2 = createPoint3D(point3DSize, new THREE.Vector3(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2));
        p1.name = this.points[0].getID();
        p2.name = this.points[1].getID();
        parent.add(p1); parent.add(p2);
        parent.name = this.getID();
        this.container3 = parent;
        this.scene.add(parent);
        return parent;
    };
    
    Segment.prototype.render = function() {
        let points = this.points;
        let ctx = this.ctx;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.beginPath();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth;
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);    
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
        this.points[0].render();
        this.points[1].render();
        this.projectAndDrawLetters();
    };
    
    Segment.prototype.boundaryContains = function(boundarySegmentIndexes, v) {
        let points = this.points;
        if (this.contains(v)) {
            boundarySegmentIndexes.push(0);
            boundarySegmentIndexes.push(1);
            return true;
        }
        return false;
    };
    
    
    /**
     * @constant Vector - 2d Arrowed vector shape on a plane
     * @param {Vec2} v1 - vector 1st point
     * @param {Vec2} v2 - vector 2nd point
     * @param {String} sideColor - side color
     * @param {Number} linewidth - line width
     */
    function Vector(v1, v2, sideColor, lineWidth, headLength) {
        Shape.call(this);
        this.points.push(new Point(v1 || new Vec2(), 2, "#000"));
        this.points.push(new Point(v2 || new Vec2()) );
        this.color = sideColor || "#000";
        this.lineWidth = lineWidth || 0;
        this.headLength = headLength;
        this.length = v2.sub(v1).length();
    }
    
    Vector.count = 0;
    Vector.prototype = Object.create(Segment.prototype);
    Vector.prototype.constructor = Vector;
    
    Vector.prototype.getID = function() {
        if (!this.ID) {
            Vector.count++;
            this.ID = "vector" + Vector.count;   
        }
        return this.ID;
    };

    Vector.prototype.setRenderAttribs = function(attrs) {
        if (getPropsCountOf(attrs) == 0) {
            return;
        }
        
        this.color = attrs.strokeStyle;
        if (this.container3) {
            this.container3.remove("child" + this.getID());     //  because of ArrowHelper design it can't be updated - so potential performance bottletneck here are unavoidable
            let vectorMesh = ArrowedVector(new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2), 
					new THREE.Vector3(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2), this.color, 70, 15);
            vectorMesh.name = "child" + this.getID();
            this.container3.add(vectorMesh ); 
        }
    };
    
    Vector.prototype.getFillColor = function() {        
        return this.color;
    };
    
    Vector.prototype.setBoundaryWidth = function(value) {
        this.lineWidth = value;
    };
    
    Vector.prototype.getBoundaryWidth = function() {
        return this.lineWidth;
    };
    
    Vector.prototype.createMeshFromThis = function() {
        let hexColor = new THREE.Color(this.color).getHex(), parent;
        let vectorMesh = ArrowedVector(new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2), 
					new THREE.Vector3(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2), hexColor, 70, 15);
        vectorMesh.name = "child" + this.getID();
        parent = new THREE.Object3D();
        parent.add(vectorMesh);
        let p1 = createPoint3D(point3DSize, new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2));
        let p2 = createPoint3D(point3DSize, new THREE.Vector3(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2));
        p1.name = this.points[0].getID();
        p2.name = this.points[1].getID();
        parent.add(p1); parent.add(p2);
        parent.name = this.getID();
        this.container3 = parent;
        this.scene.add(parent);
        return parent;
    };
    
    Vector.prototype.transform = function(transformProps, mdown, mmove) {
        let points = this.points, diff = new Vec2(), sh;
        if (this.container3) {
            sh = this.container3.getObjectByName("child" + this.getID());    
        }
          
        if (!this.transformable) {
            return;
        }
        if (!this.customTransformable) {
            if (transformProps.v1) {
                points[0].set(mmove.x, mmove.y);
            }
            if (transformProps.v2) {
                points[1].set(mmove.x, mmove.y);
            }
        }
        if (this.translatable && transformProps.translating) {
            diff = mmove.sub(mdown);
            this.translate(diff);
            sh && sh.translateX(diff.x);
            sh && sh.translateZ(diff.y);
            mdown.set(mmove.x, mmove.y);
        }
        sh && this.transformIn_3D();
        this.updateMeasureTexts();
    };
    
    Vector.prototype.transformIn_3D = function() {
        if (!this.container3) {
            return;
        }
        let sh = this.container3.getObjectByName("child" + this.getID());
        let p1 = this.container3.getObjectByName(this.points[0].getID());
        let p2 = this.container3.getObjectByName(this.points[1].getID());
        p1.position.set(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2);
        p2.position.set(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2);
    };
    
    Vector.prototype.render = function() {
        let points = this.points;    
        Segment.prototype.render.call(this);
        let ctx = this.ctx,
            lineAngle = Math.atan2((this.points[1].y - this.points[0].y), (this.points[1].x - this.points[0].x)),
            angle = Math.PI + lineAngle + Math.PI/15;
            
        ctx.save();
        ctx.globalAlpha = this.opacity;    
        ctx.beginPath();
        ctx.fillStyle = this.color;
        ctx.moveTo(this.points[1].x, this.points[1].y);
        ctx.lineTo(this.points[1].x + this.headLength*Math.cos(angle), this.points[1].y + this.headLength*Math.sin(angle));
        angle = Math.PI + lineAngle - Math.PI/15;
        ctx.lineTo(this.points[1].x + this.headLength*Math.cos(angle), this.points[1].y + this.headLength*Math.sin(angle));
        ctx.fill();
        ctx.closePath();
        ctx.restore();
    };
    
    
    /**
     * @constant Polygon - 2d polygonial shape on a plane, a base class for all other polygonial shapes
     * @param {Object Array} points - an array of polygon points
     * @param {Object} renderParams - plain javascript hash, stores render params such as fill color, linewidth, side color
     */
    function Polygon(points, renderParams) {
        Shape.call(this);
        this.renderParams = renderParams || {};
        this.side = new Segment(new Vec2(), new Vec2());
        this.side.points[0].setBoundaryWidth(0);
        this.side.points[1].setBoundaryWidth(0);
        this.points = points;
        this.sides = [];
    }
    
    Polygon.count = 0;
    Polygon.prototype = Object.create(Shape.prototype);
    Polygon.prototype.constructor = Polygon;
    
    Polygon.prototype.getID = function() {
        if (!this.ID) {
            Polygon.count++;
            this.ID = "polygon" + Polygon.count;   
        }
        return this.ID;
    };
    
    Polygon.prototype.computeSides = function() {
        let points = this.points;
        for (let i = 0; i < points.length - 1; i++) {
            this.sides[i] = points[i + 1].sub(points[i]).length(); 
        }
        this.sides[i] = points[i].sub(points[0]).length();
    };
    
    Polygon.prototype.pointsHave = function(transformProps, p) {
        let id = this.getID();
        for (let i = 0; i < this.points.length; i++) {
            if (isInCircle(p, this.points[i], 10)) {
                transformProps[id] = {};
                transformProps[id].index = i;
                return true;
            }
        }
        return false;
    };
    
    Polygon.prototype.transform = function(transformProps, mdown, mmove) {
        if (!this.transformable) {
            return;
        }
        if (typeof transformProps.index !== 'undefined') {
            this.points[transformProps.index].set(mmove.x, mmove.y);
        }
        if (this.translatable && transformProps.translating && this.opacity) {
            let diff = mmove.sub(mdown);
            this.translate(diff);
            mdown.set(mmove.x, mmove.y);
        }
        this.transformIn_3D();
        this.updateMeasureTexts();
    };
    
    Polygon.prototype.transformIn_3D = function() {
        if (!this.container3) {
            return;
        }
        let sh = this.container3.getObjectByName("child" + this.getID());
        let helper = this.container3.getObjectByName("polygonEdgesHelper");        
        this.container3.remove(helper);
        
        for (let i = 0; i < sh.geometry.vertices.length; i++) {
            sh.geometry.vertices[i].x = this.points[i].x - this.cnvW/2;
            sh.geometry.vertices[i].z = this.points[i].y - this.cnvH/2;
            let p = this.container3.getObjectByName(this.points[i].getID());
            p.position.set(this.points[i].x - this.cnvW/2, 0, this.points[i].y - this.cnvH/2); 
        }
        helper = new THREE.EdgesHelper( sh, 0x000000 ); helper.name = "polygonEdgesHelper";
        this.container3.add(helper);
        sh.geometry.verticesNeedUpdate = true;
    };
    
    Polygon.prototype.boundaryContains = function(boundarySegmentIndexes, v) {
        for (let i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
            if (isInSegment(this.points[i], this.points[j], v)) {
                boundarySegmentIndexes.push(i);
                boundarySegmentIndexes.push(j);
                return true;
            }
        }
        return false;
    };
    
    Polygon.prototype.contains = function(v) {
        let points = this.points,
            contains = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++)
        {
            if ( ( points[i].y > v.y ) != ( points[j].y > v.y ) &&
                 v.x < ( points[j].x - points[i].x ) * ( v.y - points[i].y ) / ( points[j].y - points[i].y ) + points[i].x )
            {
                contains = !contains;
            }
        }
        return contains;
    };
    
    Polygon.prototype.setRenderAttribs = function(attrs) {
        if (getPropsCountOf(attrs) == 0) {
            return;
        }
        
        this.renderParams.fillColor = attrs.fillColor;
        //this.renderParams.sideColor = attrs.strokeStyle;
        this.setBoundaryWidth(attrs.lineWidth || 1);
        if (this.container3) {
            this.container3.getObjectByName("child" + this.getID()).material.color.set(this.renderParams.fillColor); 
        }
    };
    
    Polygon.prototype.getFillColor = function() {        
        return this.renderParams.fillColor;
    };
    
    Polygon.prototype.setBoundaryWidth = function(value) {
        this.renderParams.lineWidth = value;
    };
    
    Polygon.prototype.getBoundaryWidth = function() {
        return this.renderParams.lineWidth;
    };
    
    Polygon.prototype.projectAndDrawLetters = function() {
        if (!this.container3) {
            return;
        }        
        for (let i = 0; i < this.points.length; i++) {
            let p = this.container3.getObjectByName(this.points[i].getID());
            if (p) {            
                let pos = toScreenXY(p.position, this.cnvW, this.cnvH, this.camera);
                this.cnv2DOverlayContext.fillText(this.points[i].getLetter(), pos.x, pos.y - 5);       
            }
        }
    };
    
    Polygon.prototype.createMeshFromThis = function() {
        let polygonShape = new THREE.Shape();
        let points = this.points;
        let temp, parent = new THREE.Object3D(), p;
        
        polygonShape.moveTo(points[0].x - this.cnvW/2, points[0].y - this.cnvH/2);
        p = createPoint3D(point3DSize, new THREE.Vector3(points[0].x - this.cnvW/2, 0, points[0].y - this.cnvH/2));
        p.name = points[0].getID();
        parent.add(p);
        for (let i = 1; i < points.length; i++) {
            polygonShape.lineTo(points[i].x - this.cnvW/2, points[i].y - this.cnvH/2);
            p = createPoint3D(point3DSize, new THREE.Vector3(points[i].x - this.cnvW/2, 0, points[i].y - this.cnvH/2));
            p.name = points[i].getID();
            parent.add(p);
        }
        let polygonGeom = new THREE.ShapeGeometry(polygonShape);
        for (let i = 0; i < polygonGeom.vertices.length; i++) {         //	maping to xz plane
            temp = polygonGeom.vertices[i].y;
            polygonGeom.vertices[i].y = 0;
            polygonGeom.vertices[i].z = temp;
        }
        let hexColor = new THREE.Color(this.renderParams.fillColor).getHex();
        let polygonMesh = new THREE.Mesh(polygonGeom, new THREE.MeshBasicMaterial({ color: hexColor, side: THREE.DoubleSide }));
        polygonMesh.name = "child" + this.getID();
        let helper = new THREE.EdgesHelper( polygonMesh, 0x000000 );
        helper.position.set(polygonMesh.x, polygonMesh.y, polygonMesh.z);
        helper.name = "polygonEdgesHelper";
        parent.add(polygonMesh);
        parent.add(helper);
        parent.name = this.getID();
        this.container3 = parent;
        this.scene.add(parent);
        return parent;
    };
    
    Polygon.prototype.render = function() {
        let ctx = this.ctx,
            points = this.points,
            renderParams = this.renderParams;
        ctx.save();
        ctx.globalAlpha = this.opacity;
        if (renderParams.fillColor) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.fillStyle = renderParams.fillColor;
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.fill();		
            ctx.closePath(); 
        }
        ctx.restore();
        
        for (let i = 0; i < points.length; i++) {
            points[i].render();
        }
        
        if (renderParams.lineWidth) {
            this.side.lineWidth = renderParams.lineWidth;    
        }
        if (renderParams.sideColor) {
            this.side.color = renderParams.sideColor;
        }
        let i = 0;
        for (i = 0; i < points.length - 1; i++) {
            this.side.points[0].set(points[i].x, points[i].y);
            this.side.points[1].set(points[i + 1].x, points[i + 1].y);;
            this.side.render();
        }
        this.side.points[0].set(points[i].x, points[i].y);
        this.side.points[1].set(points[0].x, points[0].y);
        this.side.render();
        this.projectAndDrawLetters();
    };
    
    Polygon.prototype.rotate = function(v, alpha) {    
        for (let i = 0; i < this.points.length; i++) {
            this.points[i].translate(v.multScalar(-1));
            this.points[i].rotate(alpha);
            this.points[i].translate(v);
        }
    };
    
    Polygon.prototype.translate = function(v) {
        let trans = translationMat(v.x, v.y),
            transFormedVertice,
            currentVertice = new Vec3();
            
        for (let i = 0; i < this.points.length; i++) {
            currentVertice.x = this.points[i].x;
            currentVertice.y = this.points[i].y;
            currentVertice.z = 1;         
            transFormedVertice = trans.multv3( currentVertice );        
            this.points[i].x = transFormedVertice.x;
            this.points[i].y = transFormedVertice.y;
        }
    };
    
    //Polygon.prototype.scale = function(v) {
    //    let scaleM = scaleMat(v.x, v.y),
    //        transFormedVertice, currentVertice = new Vec3();
    //        currentVertice.x = this.x;
    //        currentVertice.y = this.y;
    //        currentVertice.z = 1,
    //        v = scaleM.multv3(currentVertice).sub(new Vec3(this.x, this.y, 1));    //  get difference between new and old centers
    //    
    //    for (let i = 0; i < this.points.length; i++) {
    //        currentVertice.x = this.points[i].x;
    //        currentVertice.y = this.points[i].y;
    //        currentVertice.z = 1;         
    //        transFormedVertice = scaleM.multv3( currentVertice );        
    //        this.points[i].x = transFormedVertice.x - v.x;
    //        this.points[i].y = transFormedVertice.y - v.y;
    //	}
    //};
    
    
    /**
     * @constructor Triangle - 2d triangle shape on a plane, child of the Polygon class
     * @param {Object Array} points - an array of triangle 3 points
     * @param {Object} renderParams - plain javascript hash, stores render params such as fill color, linewidth, side color
     */
    function Triangle(points, renderParams) {
        Polygon.call(this, points, renderParams);
    }
    
    Triangle.count = 0;
    Triangle.prototype = Object.create(Polygon.prototype);
    Triangle.prototype.constructor = Triangle;
    
    Triangle.prototype.getID = function() {
        if (!this.ID) {
            Triangle.count++;
            this.ID = "triangle" + Triangle.count;   
        }
        return this.ID;
    };
    
    Triangle.prototype.computeSides = function() {
        let points = this.points;
        this.a = (points[1].sub(points[0])).length();
        this.b = (points[2].sub(points[1])).length();
        this.c = (points[2].sub(points[0])).length();
    };
    
    Triangle.prototype.perimeter = function() {
       return this.a + this.b + this.c;
    };
    
    Triangle.prototype.area = function() {
        let p = this.perimeter() * 0.5,
            a = this.a,
            b = this.b,
            c = this.c;        
        return Math.sqrt( p * ((p - a)*(p - b)*(p - c)) );
    };
    
    Triangle.prototype.getInCircle = function(renderParams) {
        this.computeSides();
        let p = this.perimeter() * 0.5,
            a = this.a, b = this.b, c = this.c,
            v1 = this.points[0],
            v2 = this.points[1],
            v3 = this.points[2],        
            r = Math.sqrt( ((p - a)*(p - b)*(p - c)) / p ),
            x0 = (b*v1.x + c*v2.x + a*v3.x) / (a + b + c),
            y0 = (b*v1.y + c*v2.y + a*v3.y) / (a + b + c);    
            this.inCircle = new Circle(new Vec2(x0, y0), r, renderParams || {});
            this.inCircle.circleCenter = new Circle(new Vec2(x0, y0), 1, {});
        return this.inCircle;
    };
    
    Triangle.prototype.getOutCircle = function(renderParams) {
        this.computeSides();
        let p = this.perimeter() * 0.5,
            a = this.a,
            b = this.b,
            c = this.c,
            v1 = this.points[0],
            v2 = this.points[1],
            v3 = this.points[2],       
            z1 = v1.x*v1.x + v1.y*v1.y,
            z2 = v2.x*v2.x + v2.y*v2.y,
            z3 = v3.x*v3.x + v3.y*v3.y,                
            zx = (v1.y - v2.y)*z3 + (v2.y - v3.y)*z1 + (v3.y - v1.y)*z2,
            zy = (v1.x - v2.x)*z3 + (v2.x - v3.x)*z1 + (v3.x - v1.x)*z2,        
            z =  (v1.x - v2.x)*(v3.y - v1.y) - (v1.y - v2.y)*(v3.x - v1.x),
            s = this.area(),        
            x0 = -zx / (2*z),
            y0 = zy / (2*z),
            r = (a*b*c) / (4*s);
            this.outCircle = new Circle(new Vec2(x0, y0), r, renderParams || {});
            this.outCircle.circleCenter = new Circle(new Vec2(x0, y0), 1, {});
        return this.outCircle;
    };    
    
    
    /**
     * @constructor RegularPolygon - 2d regular polygon on a plane, child class of the Polygon
     * @param {Vec2} center - center point of regular polygon
     * @param {Number} n - number of polygon sides
     * @param {Number} a - length of the side
     * @param {Object} renderParams - plain javascript hash, stores render params such as fill color, linewidth, side color
     */
    function RegularPolygon(center, n, a, renderParams) {
        this.n = n;
        this.a = a;
        this.center = new Point(center, 2, "#000");
        this.renderParams = renderParams;
        this.points = [];
        let alpha = 2*Math.PI/n;
        for (let i = 0; i < n; i++) {
            this.points[i] = new Point( new Vec2(center.x + a*Math.cos(i*alpha), center.y + a*Math.sin(i*alpha)) );        
        }
        Polygon.call(this, this.points, renderParams);
        //this.points.push();
    }
    
    RegularPolygon.count = 0;
    RegularPolygon.prototype = Object.create(Polygon.prototype);
    RegularPolygon.prototype.constructor = RegularPolygon;
    
    RegularPolygon.prototype.getID = function() {
        if (!this.ID) {
            RegularPolygon.count++;
            this.ID = "regularpolygon" + RegularPolygon.count;   
        }
        return this.ID;
    };
    
    RegularPolygon.prototype.pointsHave = function(transformProps, p) {
        let id = this.getID();
        for (let i = 0; i < this.points.length; i++) {
            if (isInCircle(p, this.points[i], 10)) {
                transformProps[id] = {};
                transformProps[id].index = i;
                return true;
            }
        }
        return false;
    };
    
    RegularPolygon.prototype.transform = function(transformProps, mdown, mmove) {
        let center = this.center;
        if (!this.transformable) {
            return;
        }
        if (typeof transformProps.index !== 'undefined') {
            let alpha = 2*Math.PI/this.n, a = center.sub(mmove).length();
            for (let i = 0; i < this.n; i++) {
                this.points[i].set(center.x + a*Math.cos(i*alpha), center.y + a*Math.sin(i*alpha));
            }
        }
        if (this.translatable && transformProps.translating && this.opacity) {
            let diff = mmove.sub(mdown);	
            this.translate(diff);
            mdown.set(mmove.x, mmove.y);
        }
        this.transformIn_3D();
        this.updateMeasureTexts();
    };
    
    RegularPolygon.prototype.transformIn_3D = function() {
        if (!this.container3) {
            return;
        }
        let sh = this.container3.getObjectByName("child" + this.getID());
        let helper = this.container3.getObjectByName("polygonEdgesHelper");        
        this.container3.remove(helper);
        
        for (let i = 0; i < sh.geometry.vertices.length; i++) {
            sh.geometry.vertices[i].x = this.points[i].x - this.cnvW/2;
            sh.geometry.vertices[i].z = this.points[i].y - this.cnvH/2;
            let p = this.container3.getObjectByName(this.points[i].getID());
            p.position.set(this.points[i].x - this.cnvW/2, 0, this.points[i].y - this.cnvH/2);
        }
        helper = new THREE.EdgesHelper( sh, 0x000000 ); helper.name = "polygonEdgesHelper";
        this.container3.add(helper);
        sh.geometry.verticesNeedUpdate = true;
    };
    
    RegularPolygon.prototype.translate = function(v) {
        let trans = translationMat(v.x, v.y),
            transFormedVertice,
            currentVertice = new Vec3();
        
        currentVertice.x = this.x; 
        currentVertice.y = this.y; 
        currentVertice.z = 1;
        transFormedVertice = trans.multv3( currentVertice ); 
        this.x = transFormedVertice.x;
        this.y = transFormedVertice.y;
        
        for (let i = 0; i < this.points.length; i++) {
            currentVertice.x = this.points[i].x;
            currentVertice.y = this.points[i].y;
            currentVertice.z = 1;         
            transFormedVertice = trans.multv3( currentVertice );        
            this.points[i].x = transFormedVertice.x;
            this.points[i].y = transFormedVertice.y;
        }
        this.center = this.center.add(v);
    };
    
    RegularPolygon.prototype.getOutCircle = function(renderParams) {
        let center = this.center,
            r = this.a;    
        this.outCircle = new Circle(new Vec2(center.x, center.y), r, renderParams || {});
        this.outCircle.circleCenter = new Circle(center, 1, {});
        return this.outCircle;
    };
    
    RegularPolygon.prototype.getInCircle = function(renderParams) {
        let a = this.points[1].sub(this.points[0]).length();
        let center = this.center,
            r = a / (2*Math.tan( Math.PI/this.n ));
            
        this.inCircle = new Circle(center, r, renderParams || {});
        return this.inCircle;
    };
    
    
    /**
     * @constructor Circle - 2d circle on a plane
     * @param {Vec2} center - center point of the circle
     * @param {Number} R - circle's radius
     * @param {Object} renderParams - plain javascript hash object, stores render params such as fill color, linewidth, side color
     * @param {Vec2} ndpoint - second point on the circle
     * @param {Number} angle - circle angle by default = 2 * PI
     */
    function Circle(center, R, renderParams, ndpoint, angle) {
        Shape.call(this);
        renderParams = renderParams || {};
        this.R = R;
        this.strokeStyle = renderParams.strokeStyle || "#000";
        this.centerLetter = renderParams.centerLetter || 0;
        this.lineWidth = renderParams.lineWidth;
        this.fillColor = renderParams.fillColor;
        this.showRadius = renderParams.showRadius;
        this.angle = angle || 2 * Math.PI;
        this.points.push(center);
        this.points.push(ndpoint);
    }
    
    Circle.count = 0;
    Circle.prototype = Object.create(Shape.prototype);
    Circle.prototype.constructor = Circle;
    
    Circle.prototype.getID = function() {
        if (!this.ID) {
            Circle.count++;
            this.ID = "circle" + Circle.count;   
        }
        return this.ID;
    };
    
    Circle.prototype.area = function() {
        return Math.PI * this.R * this.R;
    };
    
    Circle.prototype.circumference = function() {
        return 2 * Math.PI * this.R; 
    };
    
    Circle.prototype.setRenderAttribs = function(attrs) {
        if (getPropsCountOf(attrs) == 0) {
            return;
        }
        
        this.fillColor = attrs.fillColor;
        //this.strokeStyle = attrs.strokeStyle;
        this.setBoundaryWidth(attrs.lineWidth || 1);
        if (this.container3) {
            this.container3.getObjectByName("child" + this.getID()).material.color.set(this.fillColor); 
        }
    };
    
    Circle.prototype.getCenter = function() {        
        return this.points[0];
    };    
    
    Circle.prototype.getFillColor = function() {        
        return this.fillColor;
    };
    
    Circle.prototype.setBoundaryWidth = function(value) {
        this.lineWidth = value;
    };
    
    Circle.prototype.getBoundaryWidth = function() {
        return this.lineWidth;
    };
    
    Circle.prototype.projectAndDrawLetters = function() {
        if (!this.container3) {
            return;
        }
        
        for (let i = 0; i < this.points.length; i++) {
            let p = this.container3.getObjectByName(this.points[i].getID());
            if (p) {        
                let pos = toScreenXY(p.position, this.cnvW, this.cnvH, this.camera);
                this.cnv2DOverlayContext.fillText(this.points[i].getLetter(), pos.x, pos.y - 5);          
            }
        }
    };
    
    Circle.prototype.createMeshFromThis = function() {
        let circleGeometry = new THREE.CircleGeometry(this.R, 64), parent = new THREE.Object3D();
        for (let i = 0; i < circleGeometry.vertices.length; i++) {
            circleGeometry.vertices[i].z = circleGeometry.vertices[i].y;
            circleGeometry.vertices[i].y = 0;
        }
        let mat = new THREE.MeshBasicMaterial( {color: new THREE.Color(this.fillColor).getHex(), side: THREE.DoubleSide } );
        let circleMesh = new THREE.Mesh(circleGeometry, mat);
        circleMesh.name = "child" + this.getID();
        circleMesh.position.set(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2);
       
        for (let i = 0; i < this.points.length; i++) {
            let p = createPoint3D(point3DSize, new THREE.Vector3(this.points[i].x - this.cnvW/2, 0, this.points[i].y - this.cnvH/2));
            p.name = this.points[i].getID();
            parent.add(p);                        
        }
        
        let helper = new THREE.EdgesHelper( circleMesh, 0x000000 );
        helper.position.set(circleMesh.x, circleMesh.y, circleMesh.z);
        helper.name = "circleMeshHelper";
        
        parent.add(circleMesh); parent.add(helper);
        parent.name = this.getID();
        this.container3 = parent;
        this.scene.add(parent);
        return parent;
    };
    
    Circle.prototype.render = function() {
        let ctx = this.ctx, center = this.points[0], ndpoint = this.points[1];
        ctx.save();
        ctx.globalAlpha = this.opacity;  
        ctx.beginPath();
        ctx.arc(center.x, center.y, this.R, 0, this.angle, false);
        if (this.fillColor) {
            ctx.fillStyle = this.fillColor;
            ctx.fill();
        }
        ctx.restore();
        ctx.strokeStyle = this.strokeStyle;    
        ctx.lineWidth = this.lineWidth;                
        ctx.stroke();
        ctx.closePath();
           
        if (this.centerLetter) {
            ctx.font = "20px Georgia";
            ctx.fillText(this.centerLetter, center.x + 5, center.y);
        }
        if (ndpoint) {
            ndpoint.render();
        }
        center.render();
        for (let i = 2; i < this.points.length; i++) {
            this.points[i].render();
        }
        if (this.showRadius) {
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(ndpoint.x, ndpoint.y);
            ctx.stroke();
        }
        this.projectAndDrawLetters();
    };
    
    Circle.prototype.pointsHave = function(transformProps, p) {
        let id = this.getID(), center = this.points[0], ndpoint = this.points[1];        
        for (let i = 2; i < this.points.length; i++) {
            let _p = this.points[i];
            if (_p.contains(p)) {
                transformProps[id] = {};
                transformProps[id].index = i;
                return true;
            }   
        }
        
        if (center.contains(p)) {
            transformProps[id] = {};
            transformProps[id].center = 1;
            return true;
        }
        
        if (ndpoint.contains(p)) {
            transformProps[id] = {};
            transformProps[id].ndpoint = 1;
            return true;
        }
        
        return false;
    };
    
    Circle.prototype.transform = function(transformProps, mdown, mmove) {
        let center = this.points[0], ndpoint = this.points[1];
        if (!this.transformable) {
            return;
        }  
        if (transformProps.center) {
            center.set(mmove.x, mmove.y);
            this.R = mmove.sub(ndpoint).length();           
        }
        if (transformProps.ndpoint) {
            ndpoint.set(mmove.x, mmove.y);
            this.R = ndpoint.sub(center).length();
        }
        this.updateBoundaryPoints();
        if (this.translatable && transformProps.translating && this.fillColor && this.opacity) {
            let diff = mmove.sub(mdown);	
            this.translate(diff);
            mdown.set(mmove.x, mmove.y);
        }
        this.transformIn_3D();
        this.updateMeasureTexts();
    };
    
    Circle.prototype.updateBoundaryPoints = function() {
        let center = this.points[0], ndpoint = this.points[1];
        for (let i = 2; i < this.points.length; i++) {
            let alpha = Math.atan2( this.points[i].y - center.y, this.points[i].x - center.x );
            this.points[i].set(center.x + this.R * Math.cos(alpha), center.y + this.R * Math.sin(alpha));
        }
    };
    
    Circle.prototype.transformIn_3D = function() {
        if (!this.container3) {
            return;
        }
        let center = this.points[0];
        for (let i = 0; i < this.points.length; i++) {
            let p = this.container3.getObjectByName(this.points[i].getID());
            if (p) {
                p.position.set(this.points[i].x - this.cnvW/2, 0, this.points[i].y - this.cnvH/2);
            }
        }
        let sh = this.container3.getObjectByName("child" + this.getID());
        let helper = this.container3.getObjectByName("circleMeshHelper");
        if (helper) {
            this.container3.remove(helper);
        }
        sh.geometry = new THREE.CircleGeometry(this.R, 64);
        for (let i = 0; i < sh.geometry.vertices.length; i++) {
            sh.geometry.vertices[i].z = sh.geometry.vertices[i].y;
            sh.geometry.vertices[i].y = 0;
        }
        sh.position.set(center.x - this.cnvW/2, 0, center.y- this.cnvH/2);
        
        helper = new THREE.EdgesHelper( sh, 0x000000 );
        helper.position.set(sh.x, sh.y, sh.z);
        helper.name = "circleMeshHelper";
        this.container3.add(helper);
        sh.geometry.verticesNeedUpdate = true;
    };
    
    Circle.prototype.contains = function(v) {
        if (!this.fillColor) {
            return this.onCurve({}, v);       
        } else {
            let center = this.points[0], ndpoint = this.points[1];
            let dx = v.x - center.x,
                dy = v.y - center.y;					
            if ( dx*dx + dy*dy <= this.R*this.R ) {
                return true;
            }
            return false;
        }
    };
    
    Circle.prototype.onCurve = function(boundaryPoint, v) {
        let center = this.points[0], ndpoint = this.points[1];
        let dx = v.x - center.x,
            dy = v.y - center.y, EPS = 2000;
            
        if ( Math.abs(Math.floor(dx*dx + dy*dy) - Math.floor(this.R*this.R)) < EPS ) {
            boundaryPoint.p = v;
            return true;
        }
        return false;
    };
    
    Circle.prototype.boundaryContains = function(boundarySegmentIndexes, v) {
        let center = this.points[0], ndpoint = this.points[1],
            dx = v.x - center.x,
            dy = v.y - center.y;
        if ( isInSegment(center, ndpoint, v) && this.showRadius ) {
            boundarySegmentIndexes.push(0);
            boundarySegmentIndexes.push(1);
            return true;
        }
        return false;
    };
    
    Circle.prototype.translate = function(v) {
        let points = this.points;
        for (let i = 0; i < points.length; i++) {
            points[i].set(points[i].x + v.x, points[i].y + v.y);
        }
    };
    
    
    /**
     * @constructor Point - 2d point on a plane
     * @param {Vec2} v - vector with point coordinates
     * @param {Number} radius - point size or radius
     * @param {String} fillColor - point fill color
     */
    function Point(v, radius, fillColor) {
        Shape.call(this);
        this.x = v.x || 0;
        this.y = v.y || 0;
        this.radius = radius || 2;
        this.fillColor = fillColor || "#000";
        this.isVisible = true;
        this.letter = "";
    }
    
    Point.count = 0;
    Point.prototype = Object.create(Shape.prototype);
    Point.prototype.constructor = Point;
    
    Point.prototype.set = function(x, y) {
        this.x = x;
        this.y = y;
    };
    
    Point.prototype.toVec2 = function() {
        return new
            Vec2(this.x, this.y);
    };
    
    Point.prototype.copy = function() {
        return new
            Point(this.toVec2(), this.radius, this.fillColor.slice());
    };
    
    Point.prototype.add = function(v) {
        return new
            Point(this.toVec2().add(v), this.radius, this.fillColor.slice());
    };
    
    Point.prototype.sub = function(v) {
        return new
            Point(this.toVec2().sub(v), this.radius, this.fillColor.slice());
    };
    
    Point.prototype.multScalar = function(val) {
        return new
            Point(this.toVec2().multScalar(val), this.radius, this.fillColor.slice());
    };
    
    Point.prototype.dot = function(v) {
        return this.toVec2().dot(v);
    };
    
    Point.prototype.length = function() {
        return Math.sqrt(this.x*this.x + this.y*this.y);
    };
    
    Point.prototype.normalize = function() {
        let invLength = 1/this.length();
        this.x = this.x * invLength;
        this.y = this.y * invLength;
    };
    
    Point.prototype.getID = function() {
        if (!this.ID) {
            Point.count++;
            this.ID = "point" + Point.count;
        }
        return this.ID;
    };
    
    Point.prototype.setRenderAttribs = function(attrs) {
        if (getPropsCountOf(attrs) == 0) {
            return;
        }
        
        this.fillColor = attrs.fillColor;
        this.setBoundaryWidth(attrs.lineWidth || 2);
        let p = this.scene.getObjectByName(this.getID());
        if (p) {
            p.material.color.set(this.fillColor);
        }
    };
    
    Point.prototype.getFillColor = function() {        
        return this.fillColor;
    };
    
    Point.prototype.setBoundaryWidth = function(value) {
        this.radius = value;
    };
    
    Point.prototype.getBoundaryWidth = function() {
        return this.radius;
    };
    
    Point.prototype.setLetter = function(newLetter) {
        this.letter = newLetter;
    };
    
    Point.prototype.getLetter = function() {
        return this.letter;
    };
    
    Point.prototype.hasLetter = function() {
        return this.letter !== "";
    };
    
    Point.prototype.projectAndDrawLetters = function() {
        if (this.camera && this.letter !== "") {
            let obj = this.scene.getObjectByName(this.getID());
            if (obj) {
                let pos = toScreenXY(obj.position, this.cnvW, this.cnvH, this.camera);
                this.cnv2DOverlayContext.fillText(this.letter, pos.x, pos.y - 5);       
            }
        }
    };
    
    Point.prototype.createMeshFromThis = function() {
        let point3D = createPoint3D(point3DSize, new THREE.Vector3(this.x - this.cnvW/2, 0, this.y - this.cnvH/2));
        point3D.name = this.getID();
        this.scene.add(point3D);
        return point3D;
    };
    
    Point.prototype.render = function() {
        if (!this.isVisible) {
            //log("this point is NOT visible")
            return;
        }        
        let ctx = this.ctx, center = this;
        ctx.save();
        ctx.globalAlpha = this.opacity;  
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI, false);
        ctx.fillStyle = this.fillColor;
        ctx.fill();
        ctx.strokeStyle = ctx.fillStyle;    
        ctx.lineWidth = 1;                
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
        if (this.letter) {
            ctx.font = "18px Arial";
            ctx.fillText(this.letter, this.x - 15, this.y + 25);
            if (this.scene.getObjectByName(this.getID())) {
                this.projectAndDrawLetters();   
            }
        }
    };
    
    Point.prototype.pointsHave = function(transformProps, p) {
        let id = this.getID();
        if (this.contains(p)) {
            transformProps[id] = {};
            transformProps[id].translating = 1;
            return true;
        }
        return false;
    };
    
    Point.prototype.transform = function(transformProps, mdown, mmove) {
        if (!this.transformable) {
            return;
        }
        if (this.translatable) {
            this.translate(mmove);    
        }
        this.transformIn_3D();
        this.updateMeasureTexts();
    };
    
    Point.prototype.transformIn_3D = function() {
        let sh = this.scene.getObjectByName(this.getID());
        if (sh) {
            sh.position.set(this.x - this.cnvW/2, 0, this.y - this.cnvH/2);    
        }
    };
    
    Point.prototype.contains = function(v) {
        if (!v) {
            return false;
        }
        let dx = v.x - this.x,
            dy = v.y - this.y;					
        if ( dx*dx + dy*dy <= 100 ) {
            return true;
        }
        return false;
    };
    
    Point.prototype.boundaryContains = function(boundarySegmentIndexes, v) {
        boundarySegmentIndexes.push(0);
        return this.contains(v);
    };
    
    Point.prototype.log = function() {
        log(this.x.toString() + " " + this.y.toString());
    };
    
    Point.prototype.translate = function(v) {
        this.set(v.x, v.y);
    };
    
    Point.prototype.rotate = function(phi) {
        this.set( this.x * Math.cos(phi) - this.y * Math.sin(phi),
                  this.x * Math.sin(phi) + this.y * Math.cos(phi) );
    };
    
    /**
     * @constructor Text2d - 2d text shape on a plane
     * @param {String} text - text as a string
     * @param {String} font - text font style
     * @param {Vec2} v - top left coordinates of text rectangle
     */
    function Text2d(text, font, v) {
        Shape.call(this);
        this.text = text;
        this.font = font;
        this.x = v.x || 0;
        this.y = v.y || 0;
        this.points.push(new Point(v, 5));
        this.w = this.ctx.measureText(this.text).width;
    }
    
    Text2d.count = 0;
    Text2d.prototype = Object.create( Shape.prototype );
    Text2d.prototype.constructor = Text2d;
    
    Text2d.prototype.getID = function() {
        if (!this.ID) {
            Text2d.count++;
            this.ID = "Text2d" + Text2d.count;   
        }
        return this.ID;
    };
    
    Text2d.prototype.setRenderAttribs = function(attrs) {
        this.fillStyle = attrs.fillColor;
    };
    
    Text2d.prototype.getFillColor = function() {        
        return this.fillStyle;
    };
    
    Text2d.prototype.render = function() {
        let ctx = this.ctx;
        ctx.save();
        ctx.font = this.font;
        ctx.fillStyle = this.fillStyle;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    };
    
    Text2d.prototype.copy = function() {
        return new
            Text2d(this.text.slice(), this.font.slice(), new Vec2(this.x, this.y));
    };
    
    Text2d.prototype.pointsHave = function(transformProps, p) {
        let id = this.getID();
        if (this.contains(p)) {
            transformProps[id] = {};
            return true;
        }
        return false;
    };
    
    Text2d.prototype.transform = function(transformProps, mdown, mmove) {
        if (!this.translatable) {
            return;
        }
        this.translate(mmove);
    };
    
    Text2d.prototype.contains = function(v) {
        if (v.x < this.x || v.x > this.x + 1.7*this.w || v.y < this.y - parseInt(this.font) || v.y > this.y) {
            return false;
        }
        return true;
    };
    
    Text2d.prototype.boundaryContains = function(boundarySegmentIndexes, v) {
        boundarySegmentIndexes.push(0);
        return this.contains(v);
    };    
    
    Text2d.prototype.getBoundaryWidth = function() {
        //  ...
    };
    
    Text2d.prototype.translate = function(v) {
        this.x = v.x;
        this.y = v.y;
    };
    
    
 
    /**
     * @function ArrowedVector - returns arrowed vector 3d shape using some of the THREE js library functionality
     * @param {Object} from - THREE.Vector3 object, the vector begining point
     * @param {Object} to - THREE.Vector3 object, the vector end point
     * @param {Number} _headLength - arrow length
     * @param {Number} _headWidth - arrow width
     * @param {Boolean} addCircle - if true adds circle to the begining
     * @param {Boolean} unit - if true makes vector unit
     * @returns {Object} THREE.Object3D containing arrowed vector
     */
    function ArrowedVector(from, to, color, _headLength, _headWidth, addCircle, unit) {
        let parent = new THREE.Object3D(),
            headLength = _headLength,
            headWidth = _headWidth,
            direction = to.clone().sub(from),
            length = direction.length(),
            magnitudeVec = new THREE.ArrowHelper(direction.normalize(), from, unit ? 1 : length, color, headLength, headWidth );
            parent.add( magnitudeVec );
            if (addCircle) {
                parent.add(circle(10, from.x, from.y, from.z, color));				
            }
            magnitudeVec.name = "arrowHelper";
        return parent;
    }
    
    /**
     * @function buildAxis - constructs one coordinate system axis
     * @param {Object} src - THREE.Vector3 object, the axis begining point
     * @param {Object} dst - THREE.Vector3 object, the axis end point
     * @param {Boolean} dashed - if true makes axis dashed
     * @returns {Object} THREE.Line or ArrowedVector as an axis
     */
    function buildAxis(src, dst, colorHex, dashed) {
        let geom = new THREE.Geometry(), mat, axis;	
        if (dashed) {
            mat = new THREE.LineDashedMaterial({ linewidth: 3, color: colorHex, dashSize: 3, gapSize: 5 });
            geom.vertices.push(src.clone());
            geom.vertices.push(dst.clone());
            geom.computeLineDistances();
            axis = new THREE.Line(geom, mat, THREE.LinePieces);
        } else {
            mat = new THREE.LineBasicMaterial({ linewidth: 3, color: colorHex });
            axis = ArrowedVector(src, dst, colorHex, 50, 10, 0, 0);
        }
        return axis;
    }
    
    /**
     * @function createCoordinateSystem - creates 3d coord system
     * @param {Number} length - the length of each axis
     * @param {Object} position - THREE.Vector3 object, position of the coord system origin in world coordinates
     * @param {Object} colorVector - THREE.Vector3, color vector for axes
     * @param {Object} cnvParams - plain hash object, stores both 2d and 3d canvas parameters including three.js renderer camera and scene
     * @returns {Object} the axes grouped in THREE.Object3D container
     */
    function createCoordinateSystem(length, position, colorVector, cnvParams) {
        let axes = new THREE.Object3D();		
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( length, 0, 0 ), colorVector.x,  false ) ); // +X
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( -length, 0, 0 ), colorVector.x, false ) ); // -X
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, length, 0 ), colorVector.y,  false ) ); // +Y
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, -length, 0 ), colorVector.y, false ) ); // -Y
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, length ), colorVector.z,  false ) ); // +Z
        axes.add( buildAxis( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -length ), colorVector.z, false ) ); // -Z		
        axes.position.set(position && position.x || 0, position && position.y || 0, position && position.z || 0);
        
        updateCoordSystemNumbers(cnvParams, length);
        return axes;
    }
    
    /**
     * @function updateCoordSystemNumbers - updates coord system numbers on their ends
     * @param {Object} cnvParams - plain hash object, stores both 2d and 3d canvas parameters including three.js renderer camera and scene
     */
    function updateCoordSystemNumbers(cnvParams) {
        let length = cnvParams.w;
        cnvParams.camera.updateMatrixWorld();
        
        cnvParams.cnv2DOverlayContext.save();
        cnvParams.cnv2DOverlayContext.font = "18px Verdana"
        
        let pos = toScreenXY(new THREE.Vector3( length, 0, 0 ), cnvParams.w - 5, cnvParams.h, cnvParams.camera);
        cnvParams.cnv2DOverlayContext.fillText(length, pos.x, pos.y);        
        
        pos = toScreenXY(new THREE.Vector3( 0, length, 0 ), cnvParams.w - 5, cnvParams.h, cnvParams.camera);
        cnvParams.cnv2DOverlayContext.fillText(length, pos.x, pos.y);  
        
        pos = toScreenXY(new THREE.Vector3( 0, 0, length ), cnvParams.w - 5, cnvParams.h, cnvParams.camera);
        cnvParams.cnv2DOverlayContext.fillText(length, pos.x, pos.y);   
        
        cnvParams.cnv2DOverlayContext.restore();
    }
    
    /**
     * @function createTextTHREE - creates text shape in 3d using THREE.js library functionality
     * @param {String} text - text to be created as string
     * @param {Number} size - font size of the text
     * @returns {Object} - text as THREE.Mesh object
     */
    function createTextTHREE(text, size) {
        let textShapes = THREE.FontUtils.generateShapes( text,	{
            'font': 		 'helvetiker',
            'weight': 		 'normal',
            'style': 		 'normal',
            'size': 		 size,
            'curveSegments': 300
            }
        );
        let textg = new THREE.ShapeGeometry( textShapes );
        let textMesh = new THREE.Mesh( textg, new THREE.MeshBasicMaterial( { color: 0x000000, side: THREE.DoubleSide } ) ) ;
        return textMesh;
	}
    
    /**
     * @function createPoint3D - creates 3d point using THREE.js functionality
     * @param {Number} radius - point radius
     * @param {Object} v - point coordinates in world space
     * @returns {Object} point as THREE.Mesh (consisting of Sphere and lambert material)
     */
    function createPoint3D(radius, v) {
        let point3DGeom = new THREE.SphereGeometry( radius, 32, 32 );
        let mat = new THREE.MeshLambertMaterial( {color: 0x000000} );
        let point3D = new THREE.Mesh( point3DGeom, mat );
        point3D.position.set(v.x || 0, v.y || 0, v.z || 0);
        point3D.name = "point3D";
        return point3D;
    }
    
    /**
     * @function toScreenXY - projects 3D vector from world coordinates to screen space where origin is at (left, top) of the screen
     * @param {Object} position - THREE.Vector3, the vector to project
     * @param {Number} w - viewport width
     * @param {Number} h - viewport height
     * @param {Object} camera - an instance of any THREE.Camera base class
     * @returns {Object} - plain javascript hash object with x, y props of projected point, {x: somevalue1, y: somevalue2}
     */
    function toScreenXY(position, w, h, camera)  {
        let pos = position.clone();
        let projScreenMat = new THREE.Matrix4();        
        projScreenMat.multiplyMatrices( camera.projectionMatrix, new THREE.Matrix4().getInverse(camera.matrixWorld) );
        
        pos.applyProjection(projScreenMat);
        let out = {x : (pos.x + 1) * w / 2, y: (-pos.y + 1) * h / 2 };
        return out;
    }
    
    Global.shapes = Global.shapes || {
        Shape: Shape,
        Line: Line,
        Ray: Ray,
        Segment: Segment,
        Vector: Vector,
        Polygon: Polygon,
        Triangle: Triangle,
        RegularPolygon: RegularPolygon,
        Circle: Circle,
        Point: Point,
        Text2d, Text2d,
        createPoint3D: createPoint3D,
        createCoordinateSystem: createCoordinateSystem,
        updateCoordSystemNumbers : updateCoordSystemNumbers
    };

})(jQuery, THREE, DSSGeometry);