"use strict";

// TODO:
// 1. Show shape designations
// 2. Fix bug with Segment.prototype.contains method (sometimes returns false for fixed length segments because of the condition Math.floor(a1 + a2) == Math.floor(this.length))

;(function($, THREE, Global) {
    
    let log = Global.utils.log,
        Vec2 = Global.math.Vec2,
        Vec3 = Global.math.Vec3,
        Mat2 = Global.math.Mat2,
        Mat3 = Global.math.Mat3,
        radToDeg = Global.math.radToDeg,
        degToRad = Global.math.degToRad,
        getAngle = Global.math.getAngle,
        isInCircle = Global.math.isInCircle,
        isInSegment = Global.math.isInSegment,
        isInTriangle = Global.math.isInTriangle,
        translationMat = Global.math.translationMat,
        rotationMat = Global.math.rotationMat,
        scaleMat = Global.math.scaleMat,
        getPropsCountOf = Global.utils.getPropsCountOf;
     
    /**
    *  @class:       Shape
    *  @author:      Aram Gevorgyan
    *  @description: Abstract class Shape - defines common behavour for 2D and 3D geometry primitives
    */ 
    function Shape() {
        if (this.constructor === Shape) {
            throw("Can not instantiate an instance of abstract class");
        }
        
        this.className = this.constructor.name;
        this.points = [];
        this.connectedShapes = new Map();
        this.container3 = 0;
        this.transformable = true;
        this.customTransformable = false;
        this.translatable = true;
        this.rotatable = true;
        this.scalable = true;
        this.opacity = 1.0;
				this.position = new Vec2(0, 0);	//	center of the mass
                
        if (this.className !== "Text2d") {
            this.advancedlines = [];
            this._2PointsIndexes = [];
            this.midpoints = new Map();
            this.distanceTextShapes = new Map();
            this.distancePoints = new Map();
            this.angleTextShapes = new Map();
            this.anglePoints = new Map();
        }
        
        if (this.className === "Point") {
            this.isMidPoint = false;
        }
    }
    
    Shape.prototype.designations = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
    
    Shape.prototype.usedDesignations = new Map();
    
    Shape.prototype.detach = function(id) {
       this.connectedShapes.delete(id);
    };
    
    Shape.prototype.createMeshFromThis = function() {
        throw("Abstract method can't be called");
    };
    
    Shape.prototype.transformIn_3D = function() {
        throw("Abstract method can't be called");
    };
    
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
    
    Shape.prototype.advancedTransform = function(mdown, mmove) {
        let _this = this;
        _this.transformPrlPrpnBisLines(mdown, mmove);
        _this.connectedShapes.forEach(function(sh, id) {
            sh.transformPrlPrpnBisLines(mdown, mmove);
        });
    };
    
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
    
    Shape.prototype.updateMeasureTexts = function() {
        this.updateDistanceTexts();
        this.updateAngleTexts();
    };
    
    Shape.prototype.setOpacity = function(value) {
        this.opacity = value;
    };
    
    Shape.prototype.getOpacity = function() {
        return this.opacity;
    };
    
    Shape.prototype.resolveDuplicatePoints = function(parent) {
        
    };
    
    Shape.prototype.setRenderAttribs = function(attr) {
        throw("Abstract method can't be called");
    };  
    
    Shape.prototype.showDesignations = function(p) {
        throw("Abstract method can't be called");
    };
    
    Shape.prototype.getFillColor = function() {        
        throw("Abstract method can't be called");
    };
    
    Shape.prototype.copy = function() {
        throw("Abstract method can't be called");
    };
    
    Shape.prototype.transform = function(transformProps, mdown, mmove) {
        throw("Abstract method can't be called");
    };
    
    Shape.prototype.render = function() {
        throw("Abstract method can't be called");
    };
    
    Shape.prototype.contains = function(p) {
        throw("Abstract method can't be called");
    };
    
    Shape.prototype.boundaryContains = function(v) {
        throw("Abstract method can't be called");
    };
    
    Shape.prototype.pointsHave = function(p) {
        throw("Abstract method can't be called");
    };
    
    Shape.prototype.rotate = function(v, alpha) {
        throw("Abstract method can't be called");
    };
    
    Shape.prototype.translate = function(v) {
        throw("Abstract method can't be called");
    };
    
    Shape.prototype.scale = function(v) {
        throw("Abstract method can't be called");
    };
    
    Shape.prototype.setBoundaryWidth = function(value) {
        throw("Abstract method can't be called");
    };
    
    Shape.prototype.getBoundaryWidth = function() {
        throw("Abstract method can't be called");
    };
    
    /**
     *  class Line
     *  v1, v2 - infinity points
     *  p1, p2 - points on the line
     */
    function Line(v1, v2, p1, p2, sideColor, lineWidth) {
        Shape.call(this);
        this.points.push(new Point(p1 || new Vec2(), 2, "#000"));
        this.points.push(new Point(p2 || new Vec2(), 2, "#000"));
        this.points.push(new Point(v1 || new Vec2(), 2, "#000"));
        this.points.push(new Point(v2 || new Vec2(), 2, "#000")); 
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
                                    this.color.slice(), this.lineWidth  );
        
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
    
    Line.prototype.createMeshFromThis = function() {
        var lineGeometry = new THREE.Geometry(),
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
        var p1 = createPoint3D(5, new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2));
        var p2 = createPoint3D(5, new THREE.Vector3(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2));
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
        var sh = this.container3.getObjectByName("child" + this.getID());
        var p1 = this.container3.getObjectByName(this.points[0].getID());
        var p2 = this.container3.getObjectByName(this.points[1].getID());
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
            points[0].set(mmove.x, mmove.y);
            points[2].set(mmove.x - lambda*(mmove.x - prevp2.x), mmove.y - lambda*(mmove.y - prevp2.y));
            points[3].set(mmove.x + lambda*(mmove.x - prevp2.x), mmove.y + lambda*(mmove.y - prevp2.y));    
        }
        if (this.rotatable && transformProps.p2) { 
            points[1].set(mmove.x, mmove.y);
            points[2].set(mmove.x + lambda*(mmove.x - prevp1.x), mmove.y + lambda*(mmove.y - prevp1.y));
            points[3].set(mmove.x - lambda*(mmove.x - prevp1.x), mmove.y - lambda*(mmove.y - prevp1.y));    
        }
        if (this.translatable && transformProps.translating) {
            let diff = mmove.sub(mdown);
            this.translate(diff);
            mdown.set(mmove.x, mmove.y);
        }
        
        this.transformIn_3D();
        this.updateMeasureTexts();
    };
    
    //Line.prototype.showDesignations = function(fontColor, font) {
    //    let ctx = this.ctx;
    //    ctx.fillStyle = fontColor || "#00f";
    //    ctx.font = font || "17px Arial";    		
    //    ctx.fillText("A", points[2].x - 20, points[2].y);
    //    ctx.fillText("B", points[3].x + 10, points[3].y);
    //};
    
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
     *  class Ray
     *  v1 - point the ray starts from
     *  v2 - point of the ray infinity
     *  p2 - second point on the ray
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
    
    Ray.prototype.createMeshFromThis = function() {
        var rayGeometry = new THREE.Geometry(),
            rayMaterial,
            rayMesh, parent;
        rayGeometry.vertices.push(new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2));
        rayGeometry.vertices.push(new THREE.Vector3(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2));        
        rayMaterial = new THREE.LineBasicMaterial({color: new THREE.Color(this.color).getHex() });
        rayMesh = new THREE.Line(rayGeometry, rayMaterial);
        parent = new THREE.Object3D();
        parent.add(rayMesh);
        rayMesh.name = "child" + this.getID();
        var p1 = createPoint3D(5, new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2));
        var p2 = createPoint3D(5, new THREE.Vector3(this.points[2].x - this.cnvW/2, 0, this.points[2].y - this.cnvH/2));
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
            points[0].set(mmove.x, mmove.y);
            points[1].set(mmove.x - lambda*(mmove.x - prevp2.x), mmove.y - lambda*(mmove.y - prevp2.y));
        }
        if (transformProps.p2) {
            points[2].set(mmove.x, mmove.y);
            points[1].set(mmove.x + lambda*(mmove.x - prevp1.x), mmove.y + lambda*(mmove.y - prevp1.y));
        }
        if (this.translatable && transformProps.translating) {
            let diff = mmove.sub(mdown);										
            this.translate(diff);
            mdown.set(mmove.x, mmove.y);
        }
        this.transformIn_3D();
        this.updateMeasureTexts();
    };
    
    Ray.prototype.transformIn_3D = function() {
        if (!this.container3) {
            return;
        }
        var sh = this.container3.getObjectByName("child" + this.getID());
        var p1 = this.container3.getObjectByName(this.points[0].getID());
        var p2 = this.container3.getObjectByName(this.points[2].getID());
        for (var i = 0; i < sh.geometry.vertices.length; i++) {
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
     *  class Segment
     *  v1 - start point
     *  v2 - end point
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
            //if (transformProps.v1) {
            //    let ang = Math.atan2(mmove.y - points[1].y, mmove.x - points[1].x);
            //    points[0].set(points[1].x + this.length * Math.cos(ang),
            //                  points[1].y + this.length * Math.sin(ang));
            //    let prop = this.geometryEngine.getShapesGroupTransformProps(points[0], false, this.connectedShapes);
            //    for (let id in prop) {
            //        if (id !== this.getID()) {
            //            if (this.connectedShapes.has(id)) {
            //                this.connectedShapes.get(id).transform(prop[id], mdown, points[0]);        
            //            }
            //        }
            //    }
            //}
            //if (transformProps.v2) {
            //    let ang = Math.atan2(mmove.y - points[0].y, mmove.x - points[0].x);
            //    points[1].set(points[0].x + this.length * Math.cos(ang),
            //                  points[0].y + this.length * Math.sin(ang));
            //    let prop = this.geometryEngine.getShapesGroupTransformProps(points[1], false, this.connectedShapes);
            //    for (let id in prop) {
            //        if (id !== this.getID()) {
            //            if (this.connectedShapes.has(id)) {
            //                this.connectedShapes.get(id).transform(prop[id], mdown, points[1]);        
            //            }
            //        }
            //    }
            //}
        }
        
        if (this.translatable && transformProps.translating) {
            let diff = mmove.sub(mdown);
            this.translate(diff);
            mdown.set(mmove.x, mmove.y);
        }
        this.transformIn_3D();
        this.updateMeasureTexts();
    };
    
    Segment.prototype.transformIn_3D = function() {
        if (!this.container3) {
            return;
        }
        var sh = this.container3.getObjectByName("child" + this.getID());
        var p1 = this.container3.getObjectByName(this.points[0].getID());
        var p2 = this.container3.getObjectByName(this.points[1].getID());
        for (var i = 0; i < sh.geometry.vertices.length; i++) {
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
    
    Segment.prototype.createMeshFromThis = function() {
        var segmentGeometry = new THREE.Geometry(),
            segmentMaterial,
            segmentMesh, parent;
        segmentGeometry.vertices.push(new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2));
        segmentGeometry.vertices.push(new THREE.Vector3(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2));        
        segmentMaterial = new THREE.LineBasicMaterial( {color: new THREE.Color(this.color).getHex() } );
        segmentMesh = new THREE.Line(segmentGeometry, segmentMaterial);
        segmentMesh.name = "child" + this.getID();
        parent = new THREE.Object3D();
        parent.add(segmentMesh);
        var p1 = createPoint3D(5, new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2));
        var p2 = createPoint3D(5, new THREE.Vector3(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2));
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
    
    
    /*
     * Class Vector
     * Arrowed vector shape
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
        var hexColor = new THREE.Color(this.color).getHex(), parent;
        var vectorMesh = ArrowedVector(new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2), 
					new THREE.Vector3(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2), hexColor, 70, 15);
        vectorMesh.name = "child" + this.getID();
        parent = new THREE.Object3D();
        parent.add(vectorMesh);
        var p1 = createPoint3D(5, new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2));
        var p2 = createPoint3D(3, new THREE.Vector3(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2));
        p1.name = this.points[0].getID();
        p2.name = this.points[1].getID();
        parent.add(p1); parent.add(p2);
        parent.name = this.getID();
        this.container3 = parent;
        this.scene.add(parent);
        return parent;
    };
    
    Vector.prototype.transform = function(transformProps, mdown, mmove) {
        let points = this.points, diff = new Vec2();
        if (!this.container3) {
            log("can't transform 3D version of this shape ...")
            return;
        }
        let sh = this.container3.getObjectByName("child" + this.getID());
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
            sh.translateX(diff.x);
            sh.translateZ(diff.y);
            mdown.set(mmove.x, mmove.y);
        }
        this.transformIn_3D();
        this.updateMeasureTexts();
    };
    
    Vector.prototype.transformIn_3D = function() {
        if (!this.container3) {
            return;
        }
        let sh = this.container3.getObjectByName("child" + this.getID());
        var p1 = this.container3.getObjectByName(this.points[0].getID());
        var p2 = this.container3.getObjectByName(this.points[1].getID());
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
     *  class Polygon
     *  Base class for all polygonial shapes
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
        if (this.translatable && transformProps.translating) {
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
        var sh = this.container3.getObjectByName("child" + this.getID());
        for (var i = 0; i < sh.geometry.vertices.length; i++) {
            sh.geometry.vertices[i].x = this.points[i].x - this.cnvW/2;
            sh.geometry.vertices[i].z = this.points[i].y - this.cnvH/2;
            var p = this.container3.getObjectByName(this.points[i].getID());
            p.position.set(this.points[i].x - this.cnvW/2, 0, this.points[i].y - this.cnvH/2);
        }
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
    
    Polygon.prototype.createMeshFromThis = function() {
        var polygonShape = new THREE.Shape();
        var points = this.points;
        var temp, parent = new THREE.Object3D(), p;
        
        polygonShape.moveTo(points[0].x - this.cnvW/2, points[0].y - this.cnvH/2);
        p = createPoint3D(5, new THREE.Vector3(points[0].x - this.cnvW/2, 0, points[0].y - this.cnvH/2));
        p.name = points[0].getID();
        parent.add(p);
        for (let i = 1; i < points.length; i++) {
            polygonShape.lineTo(points[i].x - this.cnvW/2, points[i].y - this.cnvH/2);
            p = createPoint3D(5, new THREE.Vector3(points[i].x - this.cnvW/2, 0, points[i].y - this.cnvH/2));
            p.name = points[i].getID();
            parent.add(p);
        }
        var polygonGeom = new THREE.ShapeGeometry(polygonShape);
        for (var i = 0; i < polygonGeom.vertices.length; i++) {	//	maping to xz plane
            temp = polygonGeom.vertices[i].y;
            polygonGeom.vertices[i].y = 0;
            polygonGeom.vertices[i].z = temp;
        }
        var hexColor = new THREE.Color(this.renderParams.fillColor).getHex();
        var polygonMesh = new THREE.Mesh(polygonGeom, new THREE.MeshBasicMaterial({ color: hexColor, side: THREE.DoubleSide }));
        polygonMesh.name = "child" + this.getID();
        parent.add(polygonMesh);
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
    };
    
    Polygon.prototype.rotate = function(v, alpha) {
        //let rotM = rotationMat(alpha),
        //    trans = translationMat(v.x, v.y),
        //    transBack = translationMat(-v.x, -v.y),
        //    transFormedVertice, m, currentVertice = new Vec3();
        //    m = trans.mult( rotM ).mult(transBack);
    
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
     *  class Triangle
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
     *  class RegularPolygon  
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
        if (this.translatable && transformProps.translating) {
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
        var sh = this.container3.getObjectByName("child" + this.getID());
        for (var i = 0; i < sh.geometry.vertices.length; i++) {
            sh.geometry.vertices[i].x = this.points[i].x - this.cnvW/2;
            sh.geometry.vertices[i].z = this.points[i].y - this.cnvH/2;
            var p = this.container3.getObjectByName(this.points[i].getID());
            p.position.set(this.points[i].x - this.cnvW/2, 0, this.points[i].y - this.cnvH/2);
        }
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
     *  class Circle
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
				this.position.set(center.x, center.y);
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
    
    Circle.prototype.createMeshFromThis = function() {
        var circleGeometry = new THREE.Geometry(), parent = new THREE.Object3D();
        for (var alpha = 0; alpha <= 360; alpha++) {
            circleGeometry.vertices.push(new THREE.Vector3(this.R * Math.cos(alpha * degToRad), 0, this.R * Math.sin(alpha*degToRad)));
        }
        var mat = new THREE.LineBasicMaterial( {color: new THREE.Color(this.strokeStyle).getHex() } );
        var circleMesh = new THREE.Line(circleGeometry, mat);
        circleMesh.name = "child" + this.getID();
        circleMesh.position.set(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2);
        var p1 = createPoint3D(5, new THREE.Vector3(this.points[0].x - this.cnvW/2, 0, this.points[0].y - this.cnvH/2));
        p1.name = this.points[0].getID();
        var p2 = createPoint3D(5, new THREE.Vector3(this.points[1].x - this.cnvW/2, 0, this.points[1].y - this.cnvH/2));
        p2.name = this.points[1].getID();
        parent.add(p1); parent.add(p2);
        parent.add(circleMesh);
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
        if (this.showRadius) {
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(ndpoint.x, ndpoint.y);
            ctx.stroke();
        }
    };
    
    Circle.prototype.pointsHave = function(transformProps, p) {
        let id = this.getID(), center = this.points[0], ndpoint = this.points[1];
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
        if (this.translatable && transformProps.translating && this.fillColor) {
            let diff = mmove.sub(mdown);	
            this.translate(diff);
            mdown.set(mmove.x, mmove.y);
        }
        this.transformIn_3D();
        this.updateMeasureTexts();
    };
    
    Circle.prototype.transformIn_3D = function() {
        if (!this.container3) {
            return;
        }
        let center = this.points[0];
        for (var i = 0; i < this.points.length; i++) {
            var p = this.container3.getObjectByName(this.points[i].getID());
            p.position.set(this.points[i].x - this.cnvW/2, 0, this.points[i].y - this.cnvH/2);
        }
        var sh = this.container3.getObjectByName("child" + this.getID());
        for (var alpha = 0, i = 0; alpha <= 360; alpha++) {
            sh.geometry.vertices[i].x = this.R * Math.cos(alpha * degToRad);
            sh.geometry.vertices[i].y = 0;
            sh.geometry.vertices[i++].z = this.R * Math.sin(alpha*degToRad);
        }
        sh.position.set(center.x - this.cnvW/2, 0, center.y- this.cnvH/2)
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
            dy = v.y - center.y, EPS = 1500;
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
     * class Point
     * 2D point on the plane
     */
    function Point(v, radius, fillColor) {
        Shape.call(this);
        this.x = v.x || 0;
        this.y = v.y || 0;
        this.radius = radius || 2;
        this.fillColor = fillColor || "#000";
        this.isVisible = true;
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
    
    Point.prototype.createMeshFromThis = function() {
        var point3D = createPoint3D(5, new THREE.Vector3(this.x - this.cnvW/2, 0, this.y - this.cnvH/2));
        point3D.name = this.getID();
        this.scene.add(point3D);
        return point3D;
    };    
    
    Point.prototype.render = function() {
        if (!this.isVisible) {
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
            ctx.font = "20px Georgia";
            ctx.fillText(this.letter, this.x + 5, this.y);
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
        var sh = this.scene.getObjectByName(this.getID());
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
     *  class 2d Text
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
 
    function ArrowedVector(from, to, color, _headLength, _headWidth, addCircle, unit) {
        var parent = new THREE.Object3D(),
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
    
    function buildSegment(src, dst, colorHex, dashed) {
        var geom = new THREE.Geometry(), mat, axis;	
        if (dashed) {
            mat = new THREE.LineDashedMaterial({ linewidth: 3, color: colorHex, dashSize: 3, gapSize: 5 });
            geom.vertices.push(src.clone());
            geom.vertices.push(dst.clone());
            geom.computeLineDistances();	//	This one is SUPER important, otherwise dashed lines will appear as simple plain lines	
            axis = new THREE.Line(geom, mat, THREE.LinePieces);
        } else {
            mat = new THREE.LineBasicMaterial({ linewidth: 3, color: colorHex });
            axis = ArrowedVector(src, dst, colorHex, 50, 10, 0, 0);
        }
        return axis;
    }
    
    function createCoordinateSystem(length, position, colorVector) {
        var axes = new THREE.Object3D();		
        axes.add( buildSegment( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( length, 0, 0 ), colorVector.x,  false ) ); // +X
        axes.add( buildSegment( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( -length, 0, 0 ), colorVector.x, false ) ); // -X
        axes.add( buildSegment( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, length, 0 ), colorVector.y,  false ) ); // +Y
        axes.add( buildSegment( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, -length, 0 ), colorVector.y, false ) ); // -Y
        axes.add( buildSegment( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, length ), colorVector.z,  false ) ); // +Z
        axes.add( buildSegment( new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -length ), colorVector.z, false ) ); // -Z		
        axes.position.set(position && position.x || 0, position && position.y || 0, position && position.z || 0);	
        return axes;
    }
    
    function createPoint3D(radius, v) {
        var point3DGeom = new THREE.SphereGeometry( radius, 32, 32 );
        var mat = new THREE.MeshLambertMaterial( {color: 0x000000} );
        var point3D = new THREE.Mesh( point3DGeom, mat );
        point3D.position.set(v.x || 0, v.y || 0, v.z || 0);
        return point3D;
    }
    
    function containsP(v, x, y) {
        let dx = x - v.x,
            dy = y - v.y;					
        if ( dx*dx + dy*dy <= 100 ) {
            return true;
        }
        return false;
    };
    
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
        createCoordinateSystem: createCoordinateSystem
    };

})(jQuery, THREE, DSSGeometry);