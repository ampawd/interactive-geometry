"use strict";

// TODO:
// 1.

;(function($, THREE, Global) {
    
    let log = Global.utils.log,
        clone = Global.utils.clone,
        getPropsCountOf = Global.utils.getPropsCountOf,
        Mat2 = Global.math.Mat2,
		Shape = Global.shapes.Shape,
        Line = Global.shapes.Line,
        Ray = Global.shapes.Ray,
        Segment = Global.shapes.Segment,
        Vector = Global.shapes.Vector,
        Polygon = Global.shapes.Polygon,
        Triangle = Global.shapes.Triangle,
        RegularPolygon = Global.shapes.RegularPolygon,
        Circle = Global.shapes.Circle,
        Point = Global.shapes.Point,
        Text2d = Global.shapes.Text2d,
		Vec2 = Global.math.Vec2,
        getAngle = Global.math.getAngle,
        radToDeg = Global.math.radToDeg,
        degToRad = Global.math.degToRad,
        GeometryEngine = Global.engine.GeometryEngine;
    
    
    /**
     *  @author: Aram Gevorgyan
     *  @description: Shapes and tools constructors logic
     */    
    function getMeasuringConstructor(subtoolName, cnvParams, mdown, mmove, shapes) {
        let shape = 0,
            clicks = 0,
            cnvOffsetX = cnvParams.cnvOffsetX,
            cnvOffsetY = cnvParams.cnvOffsetY,
            geometryEngine = new GeometryEngine(),
            angle = 0,
            points = [];
        return {
            initConstruction: function() {
                let v = new Point(mdown.copy(), 2, "#000");
                points.push( v );
                if (!geometryEngine.anyShapeContains(v) || geometryEngine.insideAnyShape(v)) {
                    shapes.set(v.getID(), v);
                    v.points.push(v);
                } else {
                    points.pop();
                    points.push(geometryEngine.stickPointToFounded(v));
                }
                if (clicks === 0 && !points[0]) {
                    points[0] = v;
                    points[0].points.push(points[0]);
                    shapes.set(points[0].getID(), points[0]);
                }
                if (clicks === 1 && !points[1]) {
                    points[1] = v;
                    points[1].points.push(points[1]);
                    shapes.set(points[1].getID(), points[1]);
                }
                if (clicks === 2 && !points[2]) {
                    points[2] = v;
                    points[2].points.push(points[2]);
                    shapes.set(points[2].getID(), points[2]);
                }
            },
            constructionReady: function() {
                //switch (subtoolName) {
                //    case "ruler":
                //        let ready = true;
                //        if (!geometryEngine.anyShapeContains(mdown)) {
                //            log("not ready");
                //            ready = false;
                //            points.pop();
                //        }
                //        return ready;
                //    case "protractor":
                //        return true;
                //}
                return true;
            },
            constructionStarted: function() {
                switch (subtoolName) {
                    case "ruler": case "protractor":
                        return clicks === 0;        
                    break;
                }
            },
            processConstruction: function(e) {
                mmove.set(e.clientX - cnvParams.cnvOffsetX, e.clientY - cnvParams.cnvOffsetY);
                geometryEngine.stickPointToFounded(mmove);
                switch (subtoolName) {
                    case "ruler":
                        if (clicks === 1) {
                            let midpoint = points[0].add(mmove).multScalar(0.5).add(new Vec2(0, -15));
                            shape = new Text2d(mmove.sub(points[0]).length().toFixed(0), "10pt arial", midpoint);
                        }
                    break;
                    case "protractor":
                        if (clicks === 2) {
                            angle = getAngle(points[0], points[1], mmove) * radToDeg;
                            shape = new Text2d(angle.toFixed(0), "13pt arial", points[1].multScalar(1.02));
                        }
                    break;
                }
                return [shape];
            },
            constructionEnding: function() {
                switch (subtoolName) {
                    case "ruler":
                        return clicks === 1;
                    case "protractor":
                        return clicks === 2;
                }
            },
            endConstruction: function() {
                points.forEach(function(v) {
                    geometryEngine.stickPointToFounded(v);
                });
                let measuringShape, text;
                switch (subtoolName) {
                    case "ruler":
                        if (!points[1]) {
                            points[1] = new Point(mmove.copy(), 2, "#000");
                            points[1].points.push(points[1]);
                            shapes.set(points[1].getID(), points[1]);
                        }
                        shape.text = points[1].sub(points[0]).length().toFixed(0);                    
                        for (let i = 0, id; i < 2; i++) {
                            id = geometryEngine.getShapeIDByPoint(points[i]);                       
                            measuringShape = shapes.get(id);
                            measuringShape.distanceTextShapes.set(shape.getID(), shape);
                            measuringShape.distancePoints.set(shape.getID(), points); 
                        }
                    break;
                    case "protractor":
                        angle = getAngle(points[0], points[1], points[2]) * radToDeg;
                        shape.text = angle.toFixed(0);
                        for (let i = 0, id; i < 3; i++) {
                            id = geometryEngine.getShapeIDByPoint(points[i]);                       
                            measuringShape = shapes.get(id);
                            measuringShape.angleTextShapes.set(shape.getID(), shape);
                            measuringShape.anglePoints.set(shape.getID(), points); 
                        }
                    break;
                }
                clicks = 0; points = [];
                return shape;   //  text shape
            },
            constructionNextStep: function() {
                clicks++;
            }
        };
    }
    
    function getPointConstructor(subtoolName, cnvParams, mdown, mmove, shapes) {
        let v = 0, shape = 0, 
            shapeParts = [],
            clicks = 0,
            geometryEngine = new GeometryEngine(),
            points = [],
            cnvOffsetX = cnvParams.cnvOffsetX,
            cnvOffsetY = cnvParams.cnvOffsetY;
        return {
            initConstruction: function() {
                geometryEngine.stickPointToFounded(mdown);
                switch (subtoolName) {
                    case "freepoint":
                        v = new Point(mdown.copy(), 2, "#000");
                        v.render();
                    break;
                    case "midpoint":
                        if (clicks === 0) {
                            v = new Point(mdown.copy(), 2, "#000");
                            v.render();
                        }
                    break;
                }
            },
            constructionReady: function() {
                switch (subtoolName) {
                    case "freepoint":
                        if (geometryEngine.onAnyPointOfAnyShape(v)) {   //  dont create points on any shapes point
                            return false;
                        }
                    case "midpoint":
                        return true;
                }                
                return true;
            },
            constructionStarted: function() {
                return clicks === 0;
            },
            processConstruction: function(e) {
                v.render();
                mmove.set(e.clientX - cnvOffsetX, e.clientY - cnvOffsetY);
                geometryEngine.stickPointToFounded(mmove);
                return shapeParts;
            },
            constructionEnding: function() {
                switch (subtoolName) {
                    case "freepoint":
                        return clicks === 0;
                    case "midpoint":
                        return clicks === 1;
                }
                return false;
            },
            endConstruction: function() {
                clicks = 0;
                switch (subtoolName) {
                    case "freepoint":
                        shape = v;
                    break; 
                    case "midpoint":
                        v.set(Math.round(v.x), Math.round(v.y));               
                        shape = new Point(v.add(mmove).multScalar(0.5), 5, "#00F");
                        shape.transformable = false;
                        shape.isMidPoint = true;                        
                        let _v2 = new Point(mmove.copy(), 2, "#000");
                        let p1 = geometryEngine.onAnyPointOfAnyShape(v),
                            p2 = geometryEngine.onAnyPointOfAnyShape(_v2);
                        
                        if (!p1 && !p2) {
                            v.points.push(v);
                            shapes.set(v.getID(), v);
                            _v2.points.push(_v2);
                            shapes.set(_v2.getID(), _v2);                            
                            v.midpoints.set(shape.getID(), [v, _v2, shape]);
                            _v2.midpoints.set(shape.getID(), [v, _v2, shape]);
                        } else {
                            if (!p1) {
                                v.points.push(v);
                                shapes.set(v.getID(), v);
                            }
                            if (!p2) {
                                _v2.points.push(_v2);
                                shapes.set(_v2.getID(), _v2);
                            }
                            v = geometryEngine.stickPointToFounded(v);
                            _v2 = geometryEngine.stickPointToFounded(_v2);                            
                            let id = geometryEngine.getShapeIDByPoint(v);
                            if (shapes.has(id)) {
                                shapes.get(id).midpoints.set(shape.getID(), [v, _v2, shape]);
                            }
                            id = geometryEngine.getShapeIDByPoint(_v2);
                            if (shapes.has(id)) {
                                shapes.get(id).midpoints.set(shape.getID(), [v, _v2, shape]);
                            }
                        }
                    break;
                }
                shape.points.push(shape);
                geometryEngine.createConnectedShapesGroup(shape);
                return shape;
            },
            constructionNextStep: function() {
                clicks++;
            }
        };
    }
    
    function getLineConstructor(subtoolName, cnvParams, mdown, mmove, shapes) {
        let strokeStyle = "#000",
            lineWidth = 1,
            shape = 0,
            v1 = 0,
            v2 = 0,
            lambda = 0,
            clicks = 0,
            geometryEngine = new GeometryEngine(),
            cnvOffsetX = cnvParams.cnvOffsetX,
            cnvOffsetY = cnvParams.cnvOffsetY,
            cnvW = cnvParams.w, cnvH = cnvParams.h,
            fixedLength = 0,
            _2PointsIndexes = [],
            advancedShapes = [],
            points = [],
            det = 0,
            alpha = 0;
        return {
            constructionStarted: function() {
                return clicks === 0;
            },
            initConstruction: function() {
                geometryEngine.stickPointToFounded(mdown);
                switch (subtoolName) {
                    case "linethrpoints":
                    case "ray":
                        v1 =  mdown.copy();
                        v2 =  mdown.copy();
                        lambda = cnvW + cnvH;
                        break;
                    case "angle_bisector":
                        v1 =  mdown.copy();
                        v2 =  mdown.copy();
                        lambda = cnvW + cnvH;
                        points.push(mdown.copy());
                        let v = new Point(points[clicks], 2, "#000");                        
                        if (!geometryEngine.anyShapeContains(v) || geometryEngine.insideAnyShape(v)) {
                            shapes.set(v.getID(), v);
                            v.points.push(v);
                        } else {
                            points.pop();
                            points.push(geometryEngine.stickPointToFounded(v));
                        }
                        if (clicks === 0 && !points[0]) {
                            points[0] = v;
                            points[0].points.push(points[0]);
                            shapes.set(points[0].getID(), points[0]);
                        }
                        if (clicks === 1 && !points[1]) {
                            points[1] = v;
                            points[1].points.push(points[1]);
                            shapes.set(points[1].getID(), points[1]);
                        }
                        if (clicks === 2 && !points[2]) {
                            points[2] = v;
                            points[2].points.push(points[2]);
                            shapes.set(points[2].getID(), points[2]);
                        }                        
                        break;
                    case "segment":
                    case "vector":
                        v1 =  mdown.copy();
                        v2 =  mdown.copy();
                        break;
                    case "fixedsegment":
                        v1 = mdown.copy();
                        fixedLength = parseFloat(prompt("Enter segment length"));                        
                        if (isNaN(fixedLength) || fixedLength < 10) {
                            //log("NAN");
                            return;
                        }
                        break;
                }                
                geometryEngine.stickPointToFounded(v1);
                geometryEngine.stickPointToFounded(v2);
            },
            constructionReady: function() {
                switch(subtoolName) {
                    case "linethrpoints": case "ray": case "segment": case "vector": case "fixedsegment": case "angle_bisector":
                        return true;
                    case "parallelline": case "perpendicularline":
                        if (!geometryEngine.anyShapeContains(mdown) && clicks === 0) {
                            log("invalid parallel or perpendicular line tool usage");
                            return false;
                        }
                        return true;
                }
                return false;
            },
            processConstruction: function(e) {
                mmove.set(e.clientX - cnvOffsetX, e.clientY - cnvOffsetY);
                geometryEngine.stickPointToFounded(mmove);            
                switch (subtoolName) {
                    case "linethrpoints":
                        v1.set(mmove.x - lambda*(mmove.x - mdown.x), mmove.y - lambda*(mmove.y - mdown.y));						
                        v2.set(mmove.x + lambda*(mmove.x - mdown.x), mmove.y + lambda*(mmove.y - mdown.y));
                        shape = new Line(v1, v2, mdown.copy(), mmove.copy(), strokeStyle.slice(), lineWidth);
                        break;
                    case "ray":
                        v2.set(mmove.x + lambda*(mmove.x - mdown.x), mmove.y + lambda*(mmove.y - mdown.y));
                        shape = new Ray(v1, v2, mmove.copy(), strokeStyle.slice(), lineWidth);
                        break;
                    case "segment":
                        v2 = new Point(mmove.copy(), 2, "#000");
                        shape = new Segment(v1, v2, strokeStyle.slice(), lineWidth);
                        break;
                    case "fixedsegment":
                        break;
                    case "vector":
                        v2 = new Point(mmove.copy(), 2, "#000");
                        shape = new Vector(v1, v2, strokeStyle.slice(), lineWidth, 25);
                        break;
                    case "parallelline": case "perpendicularline":
                        v1 = new Point(mdown.copy(), 2, "#000");
                        break;
                    case "angle_bisector":
                        if (clicks === 2) {
                            v1.set(mmove.x - lambda*(mmove.x - points[1].x), mmove.y - lambda*(mmove.y - points[1].y));						
                            v2.set(mmove.x + lambda*(mmove.x - points[1].x), mmove.y + lambda*(mmove.y - points[1].y));                            
                            shape = new Line(v1, v2, points[1].copy(), mmove.copy(), strokeStyle.slice(), lineWidth);
                            shape.points[1].isVisible = false;
                            shape.points[1].radius = 0;
                            det = (mmove.x - points[0].x)*(points[1].y - points[0].y) - (points[1].x - points[0].x)*(mmove.y - points[0].y);                            
                            alpha = 0;                            
                            if (det >= 0) {
                                alpha = -getAngle(points[0], points[1], mmove);
                            } else {
                                alpha = getAngle(points[0], points[1], mmove);
                            }                            
                            shape.rotate(shape.points[0].toVec2(), alpha/2);                          
                        }
                        break;
                }
                return [shape];
            },
            constructionEnding: function() {
                if (subtoolName !== "parallelline" && subtoolName !== "perpendicularline" && subtoolName !== "angle_bisector" && clicks > 0) {
                    if (shape.points[0].contains(shape.points[1])) {
                        clicks--;
                    }
                    if (subtoolName === "ray" && shape.points[0].contains(shape.points[2])) {
                        clicks--;    
                    }
                }
                if (subtoolName === "fixedsegment") {
                    return true;
                }
                if (subtoolName === "angle_bisector") {
                    return clicks === 2;
                }
                return clicks === 1;
            },
            endConstruction: function() {
                clicks = 0;
                switch(subtoolName) {
                    case "fixedsegment":
                        let _v2 = new Vec2(v1.x + fixedLength, v1.y);
                        shape = new Segment(v1, _v2, strokeStyle.slice(), lineWidth);
                        shape.customTransformable = true;
                        shape.fixedLength = true;
                        break;
                    case "parallelline": case "perpendicularline":
                        let toShape = 0;
                        shape = new Line(v1, v2, mdown, mmove, strokeStyle.slice(), lineWidth);                    
                        _2PointsIndexes = [];
                        for (var entry of shapes) {
                            if (entry[1].className !== "Point" && entry[1].className !== "Text2d" && entry[1].boundaryContains(_2PointsIndexes, mmove)) {
                                toShape = entry[1];
                                break;
                            }
                        }
                        if (!toShape) {
                            log("can\'t create parallel / perpendicular line");
                            shape = 0;
                            return shape;
                        } else {
                            geometryEngine.stickPointToFounded(v1).translatable = false;
                            lambda = cnvW + cnvH;
                            let p1 = toShape.points[_2PointsIndexes[0]],
                                p2 = toShape.points[_2PointsIndexes[1]],
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
                                shape.points[0].isVisible = false;
                                shape.points[0].radius = 0;
                                shape.points[1].isVisible = false;
                                shape.points[1].radius = 0;
                                shape.rotatable = false;                            
                            shape.parallel = true;                                                    
                            if (subtoolName === "perpendicularline") {
                                shape.rotate(pp1, Math.PI * 0.5);
                                shape.perpendicular = true;
                            }
                            toShape.advancedlines.push([v1, shape]);
                            toShape._2PointsIndexes.push([p1, p2]);
                        }
                        break;
                    
                    case "angle_bisector":
                        shape.bisector = true;
                        shape.points[1].translatable = false;
                        shape.points[1].isVisible = false;
                        shape.points[1].radius = 0;
                        for (let i = 0; i < 3; i++) {
                            points[i] = geometryEngine.stickPointToFounded(points[i]);                       
                        }
                        for (let i = 0, id, bisectorPointShape; i < 3; i++) {
                            id = geometryEngine.getShapeIDByPoint(points[i]);
                            bisectorPointShape = shapes.get(id);
                            bisectorPointShape.advancedlines.push([points, shape]);
                        }
                        break;
                }
               
                geometryEngine.createConnectedShapesGroup(shape);
                for (let i = 0; i < shape.points.length; i++) {
                    if (shape.points[i].isMidPoint) {
                        shape.points[i].transformable = false;
                        shape.translatable = false;
                        break;
                    }
                }
                points = [];
                return shape;						
            },
            constructionNextStep: function() {
                clicks++;
            }
        };
    }
    
    function getPolygonConstructor(subtoolName, cnvParams, mdown, mmove, shapes) {
        let renderParams = {
            strokeStyle: "#000",
            fillColor: "#00f",
            lineWidth: 1
        },
        points = [], currentPoint = 0,
        geometryEngine = new GeometryEngine(),
        shape = 0, shapeParts = [],
        regpolygonCenter,
        side = 0, 
        n = 0,
        clicks = 0,
        cnvOffsetX = cnvParams.cnvOffsetX,
        cnvOffsetY = cnvParams.cnvOffsetY;
        return {
            initConstruction: function() {
                geometryEngine.stickPointToFounded(mdown);
                switch (subtoolName) {
                    case "freepolygon":
                        points.push(new Point(mdown.copy(), 2));
                        currentPoint = new Point(mdown.copy(), 2);
                    break;
                    case "regpolygon":							
                        if (clicks == 0) {
                            regpolygonCenter = new Point(mdown.copy(), 2, "#000");
                            regpolygonCenter.render();							
                        }
                        if (!n) {
                            n = parseInt(prompt("Please enter number of points"));
                            if (n < 3 || !n) {                                
                                return;
                            }
                        }
                    break;
                }
            },
            constructionStarted: function() {
                return clicks == 0;
            },
            constructionReady: function() {
                return true;
            },
            processConstruction: function(e) {
                mmove.set(e.clientX - cnvOffsetX, e.clientY - cnvOffsetY);
                geometryEngine.stickPointToFounded(mmove);
                switch (subtoolName) {
                    case "freepolygon":
                        shapeParts[clicks]
                            = new Segment(mdown.copy(), mmove.copy(), renderParams.strokeStyle, renderParams.lineWidth);
                    break;	
                    case "regpolygon":
                        if (n < 3 || !n) {
                            clicks = 0;
                            regpolygonCenter = 0;
                            n = 0; side = 0;
                            return false;
                        }
                        side = mmove.sub(regpolygonCenter).length();
                        shapeParts[clicks] = new RegularPolygon(regpolygonCenter, n, side, renderParams);								
                    break;
                }
                return shapeParts;
            },
            constructionEnding: function() {
                switch (subtoolName) {
                    case "freepolygon":
                        if ( points.length > 3 && currentPoint.contains(points[0]) ) {
                            cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);
                            points[0].set(currentPoint.x, currentPoint.y);
                            return true;	
                        }
                    break;
                    case "regpolygon":
                        if (clicks > 0) {
                            for (let i = 0; i < shapeParts[clicks].points.length; i++) {
                                if (regpolygonCenter.contains(shapeParts[clicks].points[i])) {
                                    clicks--; break;
                                }
                            }    
                        }
                        return clicks == 1;
                    break;
                }
                return false;
            },				
            endConstruction: function() {
                points.pop();
                switch (subtoolName) {
                    case "freepolygon":
                        if (points.length == 3) {
                            shape = new Triangle(points, clone(renderParams));
                        } else {
                            shape = new Polygon(points, clone(renderParams));
                        }
                    break;
                    case "regpolygon":
                        shape = new RegularPolygon(regpolygonCenter, n, side, clone(renderParams));							
                    break;
                }					
                points = [];
                shapeParts = [];
                clicks = 0;
                n = 0;
                geometryEngine.createConnectedShapesGroup(shape);
                return shape;
            },
            constructionNextStep: function() {
                clicks++;
            }
        };
    }
    
    function getCircleConstructor(subtoolName, cnvParams, mdown, mmove, shapes) {
        let renderParams = {
            strokeStyle: "#000",
            lineWidth: 1
        },
        geometryEngine = new GeometryEngine(),
        shape = 0,
        shapeParts = [],
        circleCenter = 0,
        radius = 0,
        ndpoint = new Point(new Vec2(0, 0), 2, "#000"),
        clicks = 0,
        cnvOffsetX = cnvParams.cnvOffsetX,
        cnvOffsetY = cnvParams.cnvOffsetY;
        return {
            constructionStarted: function() {
                return clicks == 0;
            },				
            initConstruction: function() {
                geometryEngine.stickPointToFounded(mdown);	
                switch (subtoolName) {
                    case "circlethrpoint":
                        if (clicks == 0) {
                            circleCenter = new Point(mdown.copy(), 2, "#000");
                            circleCenter.render();
                        }
                    break;	
                    case "circleradcenter":
                        ndpoint = new Point(new Vec2(0, 0), 2, "#000");
                        if (clicks == 0) {
                            circleCenter = new Point(mdown.copy(), 2, "#000");
                            circleCenter.render();
                        }
                        if (!radius) {
                            radius = parseFloat(prompt("Please enter the radius"));
                            if (radius < 3 || !radius) {                                
                                return;
                            }
                        }
                    break;
                }
            },
            constructionReady: function() {
                return true;
            },
            processConstruction: function(e) {
                mmove.set(e.clientX - cnvOffsetX, e.clientY - cnvOffsetY);
                geometryEngine.stickPointToFounded(mmove);
                switch (subtoolName) {
                    case "circlethrpoint":							
                        radius = mmove.sub(circleCenter).length();
                        ndpoint = new Point(mmove.copy(), 2, "#000");
                        shapeParts[clicks] = new Circle(circleCenter.copy(), radius, renderParams, ndpoint);							
                        circleCenter.render();
                    break;						
                }
                return shapeParts;
            },
            constructionEnding: function() {
                switch (subtoolName) {
                    case "circlethrpoint":
                        if (clicks > 0 && shapeParts[clicks].points[0].contains(shapeParts[clicks].points[1])) {
                            clicks--;
                        }
                        return clicks == 1;
                    case "circleradcenter":
                        return radius;
                }
                return false;
            },				
            endConstruction: function() {
                switch (subtoolName) {
                    case "circlethrpoint":
                        shape = new Circle(circleCenter.copy(), radius, clone(renderParams), ndpoint);
                    break;
                    case "circleradcenter":
                        renderParams.showRadius = 1;
                        ndpoint.set(circleCenter.x - radius*Math.cos(Math.PI), circleCenter.y - radius*Math.sin(Math.PI));
                        shape = new Circle(circleCenter.copy(), radius, clone(renderParams), ndpoint);
                    break;
                }
                shapeParts = [];
                clicks = 0;
                radius = 0;
                geometryEngine.createConnectedShapesGroup(shape);
                return shape;
            },
            constructionNextStep: function() {
                clicks++;
            }
        };
    }
    
    function shapeConstructorFactory(cnvParams, shapes) {
        this.cnvParams = cnvParams;
        this.shapes = shapes;
        
        this.getConstructor = function(toolName, subtoolName, mdown, mmove) {
            switch (toolName) {
                case "measures":
                    return getMeasuringConstructor(subtoolName, this.cnvParams, mdown, mmove, this.shapes);
                case "point":
                    return getPointConstructor(subtoolName,     this.cnvParams, mdown, mmove, this.shapes);
                case "line":
                    return getLineConstructor(subtoolName,      this.cnvParams, mdown, mmove, this.shapes);					
                case "polygon":
                    return getPolygonConstructor(subtoolName,   this.cnvParams, mdown, mmove, this.shapes);
                case "circle":
                    return getCircleConstructor(subtoolName,    this.cnvParams, mdown, mmove, this.shapes);
                default:
                    return false;
            }
        }
    }
    
    Global.tools = Global.tools || {
        shapeConstructorFactory: shapeConstructorFactory
    };

})(jQuery, THREE, DSSGeometry);