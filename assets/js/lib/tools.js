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
        createPoint3D = Global.shapes.createPoint3D,
		Vec2 = Global.math.Vec2,
        getAngle = Global.math.getAngle,
        radToDeg = Global.math.radToDeg,
        degToRad = Global.math.degToRad,
        toWorldSpace = Global.math.toWorldSpace,
        toClipSpace = Global.math.toClipSpace,
        getPickedObjects3D =  Global.math.getPickedObjects3D,
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
                            shape = new Text2d(mmove.sub(points[0]).length().toFixed(2), "10pt arial", midpoint);
                        }
                    break;
                    case "protractor":
                        if (clicks === 2) {
                            angle = getAngle(points[0], points[1], mmove) * radToDeg;
                            shape = new Text2d(angle.toFixed(2), "13pt arial", points[1].multScalar(1.02));
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
                        shape.text = points[1].sub(points[0]).length().toFixed(2);                    
                        for (let i = 0, id; i < 2; i++) {
                            id = geometryEngine.getShapeIDByPoint(points[i]);                       
                            measuringShape = shapes.get(id);
                            measuringShape.distanceTextShapes.set(shape.getID(), shape);
                            measuringShape.distancePoints.set(shape.getID(), points); 
                        }
                    break;
                    case "protractor":
                        angle = getAngle(points[0], points[1], points[2]) * radToDeg;
                        shape.text = angle.toFixed(2);
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
                            let foundedPoint = geometryEngine.stickPointToFounded(v1);
                            foundedPoint && (foundedPoint.translatable = false);
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
            fillColor: "#cf3939",
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
            fillColor: "#569",
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
    
    function get3DShapesConstructor(subtoolName, cnvParams, mdown, mmove, shapes, shapes_3D) {
        let renderParams = {
            strokeStyle: "#000",
            fillColor: "#569",
            lineWidth: 1
        },
        geometryEngine = new GeometryEngine(),
        mesh = 0,
        point3DSize = 10,
        shapeParts = [],
        meshPosition = new THREE.Vector3(),
        radius = 0, numVertices = 3,
        clicks = 0,
        cylHeight = 0,
        boxSizes,
        container,
        cnvOffsetX = cnvParams.cnvOffsetX + cnvParams.w + 5,
        cnvOffsetY = cnvParams.cnvOffsetY,
        mouse3D = new THREE.Vector3(),
        mdown3D = new THREE.Vector3(),
        helpCenterMesh = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 64), new THREE.MeshLambertMaterial({color: 0x333333, transparent: true, opacity: 0.85})),
        mat4 = new THREE.Matrix4(),
        mat41 = new THREE.Matrix4();
        //cnvParams.scene.add(helpCenterMesh);
        
        return {
            constructionStarted: function() {
                return clicks == 0;
            },				
            initConstruction: function() {
                mdown3D = toWorldSpace(mdown, cnvParams.w, cnvParams.h, cnvParams.camera, mat41);
                mdown3D.set(mdown3D.x, 0, mdown3D.z);
            },
            constructionReady: function() {
                switch (subtoolName) {
                    case "sphererad":
                        let coordArray = prompt("Specify center coordinates separated with semicolon");
                        if (coordArray === null) {
                            return false;
                        }
                        coordArray = coordArray.split(",");
                        meshPosition.set(+coordArray[0], +coordArray[1], +coordArray[2]);
                        if (!meshPosition) {
                            alert("Enter valid center coordinates");
                            return false;
                        }
                        radius = parseFloat( prompt("Enter sphere radius:") );
                        if (!radius) {
                            alert("Enter valid radius");
                            return false;
                        }
                    break;
                    case "box":
                        let pos = prompt("Enter position coordinates separated with semicolon:");
                            if (pos === null) {
                                return false;
                            }
                            boxSizes = prompt("Specify the sizes separated with semicolon");
                            if (boxSizes === null) {
                                return false;
                            }
                            boxSizes = boxSizes.split(",");
                            pos = pos.split(",");
                            meshPosition.set(+pos[0], +pos[1], +pos[2]);
                            if (!meshPosition) {
                                alert("Enter valid box center coordinates");
                                return false;
                            }
                    break;
                    case "cylinder":
                        let coordArrayCyl = prompt("Specify position coordinates separated with semicolon");
                        if (coordArrayCyl === null) {
                            return false;
                        }
                        coordArrayCyl = coordArrayCyl.split(",");
                        meshPosition.set(+coordArrayCyl[0], +coordArrayCyl[1], +coordArrayCyl[2]);
                        radius = parseFloat( prompt("Enter radius:") );
                        if (!meshPosition) {
                            alert("Enter valid center coordinates");
                            return false;
                        }
                        if (!radius) {
                            alert("Enter valid radius");
                            return false;
                        }
                        cylHeight = parseFloat( prompt("Enter cylinder height:") );
                        if (!cylHeight) {
                            alert("Enter valid height for cylinder");
                            return false;
                        }
                    break;
                    case "cone":
                        let coordArrayCone = prompt("Specify position coordinates separated with semicolon");
                            if (coordArrayCone === null) {
                                return false;
                            }
                            coordArrayCone = coordArrayCone.split(",");
                            meshPosition.set(+coordArrayCone[0], +coordArrayCone[1], +coordArrayCone[2]);
                            radius = parseFloat( prompt("Enter radius for base:") );
                            if (!meshPosition) {
                                alert("Enter valid center coordinates");
                                return false;
                            }
                            if (!radius) {
                                alert("Enter valid radius");
                                return false;
                            }
                            cylHeight = parseFloat( prompt("Enter cone height:") );
                            if (!cylHeight) {
                                alert("Enter valid height for cone");
                                return false;
                            }
                    break;
                    case "prism":
                        let coordArrayPrism = prompt("Specify position coordinates separated with semicolon");
                            if (coordArrayPrism === null) {
                                return false;
                            }
                            coordArrayPrism = coordArrayPrism.split(",");
                            meshPosition.set(+coordArrayPrism[0], +coordArrayPrism[1], +coordArrayPrism[2]);
                            let sideAndVerts = prompt("Enter polygon side and number of vertices:");
                            if (!meshPosition) {
                                alert("Enter valid center coordinates");
                                return false;
                            }
                            if (!sideAndVerts) {
                                alert("Enter valid polygon side");
                                return false;
                            }
                            radius = parseFloat(sideAndVerts.split(",")[0]);
                            numVertices = parseFloat(sideAndVerts.split(",")[1]);
                            cylHeight = parseFloat( prompt("Enter prism height:") );
                            if (!cylHeight) {
                                alert("Enter valid height for prism");
                                return false;
                            }
                    break;
                }
                
                return true;
            },
            processConstruction: function(e) {
                //switch (subtoolName) {
                //    case "sphererad":               
                //        break;
                //    case "box":                  
                //        break;
                //    case "cylinder":
                //        break;
                //}            
                //helpCenterMesh.position.set(mouse3D.x, 0, mouse3D.z);                
                return shapeParts;
            },
            constructionEnding: function() {
                return true;    //  clicks == 1;
            },				
            endConstruction: function() {
                container = new THREE.Object3D();
                container.position.set(meshPosition.x, meshPosition.y, meshPosition.z);  
                switch (subtoolName) {
                    case "sphererad":
                        let sphereGeom = new THREE.SphereGeometry(radius, 64, 64);
                        let sphereMat = new THREE.MeshLambertMaterial({color: 0x333333, transparent: true, opacity: 0.85});
                        mesh = new THREE.Mesh(sphereGeom, sphereMat);
                        mesh.geometry.computeBoundingSphere();
                        let center = mesh.geometry.boundingSphere.center;
                        container.add(createPoint3D(point3DSize, center.clone()));
                    break;
                    case "box":
                        let boxGeom = new THREE.BoxGeometry(+boxSizes[0], +boxSizes[1], +boxSizes[2]);
                        let boxMat = new THREE.MeshLambertMaterial({color: 0xffeeee, transparent: true, opacity: 0.85});
                        mesh = new THREE.Mesh(boxGeom, boxMat);
                        boxGeom.vertices.forEach(function(vert) {
                            container.add(createPoint3D(point3DSize, vert.clone()));
                        });
                    break;
                    case "cylinder": case "cone": case "prism":
                        let cylGeom = new THREE.CylinderGeometry(subtoolName == "cone" ? 0 : radius, radius, cylHeight, subtoolName == "prism" ? numVertices : 32, subtoolName == "prism" ? numVertices : 32);
                        let cylMat = new THREE.MeshLambertMaterial({color: subtoolName == "cone" ? 0x456789 : subtoolName == "prism" ? 0x123456 : 0x554433, transparent: true, opacity: 0.85});
                        mesh = new THREE.Mesh(cylGeom, cylMat);
                        mesh.geometry.computeBoundingSphere();
                        let centerCyl = mesh.geometry.boundingSphere.center;
                        
                        if (subtoolName === "cylinder" || subtoolName === "cone") {
                            container.add(createPoint3D(point3DSize, new THREE.Vector3(centerCyl.x, centerCyl.y - cylHeight * 0.5, centerCyl.z)));
                            container.add(createPoint3D(point3DSize, new THREE.Vector3(centerCyl.x, centerCyl.y + cylHeight * 0.5, centerCyl.z)));
                        }
                        
                        if (subtoolName === "prism") {
                            cylGeom.vertices.forEach(function(vert) {
                                container.add(createPoint3D(point3DSize, vert.clone()));    
                            });
                        }
                    break;
                }
                container.add(mesh);
                cnvParams.scene.add(container);
                shapes_3D.set(container.uuid, container);
                cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);		
                
                shapeParts = [];
                clicks = 0;
                radius = 0;
                return mesh;
            },
            constructionNextStep: function() {
                clicks++;
            }
        };
    }
    
    function getSurfacesConstructor(subtoolName, cnvParams, mdown, mmove, shapes, shapes_3D) {
        let renderParams = {
            strokeStyle: "#000",
            fillColor:   "#569",
            lineWidth:    1
        },
        geometryEngine = new GeometryEngine(),
        meshPosition = new THREE.Vector3(),
        mesh = 0,
        shapeParts = [],
        clicks = 0,
        objs = [],
        container = new THREE.Object3D(),
        cnvOffsetX = cnvParams.cnvOffsetX + cnvParams.w + 5,
        cnvOffsetY = cnvParams.cnvOffsetY,
        mouse3D = new THREE.Vector3(),
        mdown3D = new THREE.Vector3();
        
        function planeThrou3Points(v1, v2, v3, scene) {
            var planeGeom, planeMat, planeMesh;
            
            planeGeom = new THREE.Geometry();
            planeGeom.vertices.push(v1, v2, v3);
            var face = new THREE.Face3(0, 1, 2);
            planeGeom.faces.push(face);            
            planeGeom.computeFaceNormals();
            planeGeom.computeVertexNormals();
            planeMat = new THREE.MeshBasicMaterial({color: 0x989898, side: THREE.DoubleSide});
            planeMesh = new THREE.Mesh(planeGeom, planeMat);
            scene.add(planeMesh);
            
            planeGeom = new THREE.PlaneBufferGeometry(700, 700);
            planeMat = new THREE.MeshBasicMaterial({color: 0x5d46456, side: THREE.DoubleSide, transparent: true, opacity: 0.5});
            planeMesh = new THREE.Mesh(planeGeom, planeMat);            
            
            var orthoPlaneNormal = new THREE.Vector3(0, 0, 1);            
            var axis = face.normal.clone().cross(orthoPlaneNormal);
            var angle = Math.acos( face.normal.dot( orthoPlaneNormal ) );             
            var rotationWorldMatrix = new THREE.Matrix4();
            rotationWorldMatrix.makeRotationAxis(axis.normalize(), -angle);
            planeMesh.matrix.multiply(rotationWorldMatrix);
            planeMesh.rotation.setFromRotationMatrix(planeMesh.matrix);

            scene.add(planeMesh);
        }
        
        planeThrou3Points(
            new THREE.Vector3(200, 12, 0),
            new THREE.Vector3(150, 0, -450),
            new THREE.Vector3(200, 200, 134),
            
            cnvParams.scene
        );
        
        cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
        
        //let objects = [];
        //for (let i = 0; i < cnvParams.scene.children.length; i++) {
        //    if (cnvParams.scene.children[i].name !== "coordSystem" && cnvParams.scene.children[i].name !== "light1") {
        //        cnvParams.scene.children[i].children.forEach(function(mesh) {
        //            objects.push(mesh);     //  raycaster.intersects(objects) objects must be an array of meshes (not Object3D's)
        //        });
        //    }
        //}
        
        //let surfaceMesh, surfaceGeom, surfaceMat;
        //surfaceGeom = new THREE.Geometry();
        //surfaceMat = new THREE.MeshLambertMaterial({side: THREE.DoubleSide, color: 0x0000ee});

        return {
            constructionStarted: function() {
                return clicks === 0;
            },				
            initConstruction: function() {
                toClipSpace(mdown, cnvParams.w, cnvParams.h, mdown3D);
                objs = getPickedObjects3D(cnvParams.scene.children, cnvParams.camera, mdown3D);
                objs.forEach(function(intersect) {
                    log(intersect.object);
                });
                
                //objs.forEach(function(intersect) {
                //    if (intersect.object.name == "point3D") {   
                //        surfaceGeom.vertices.push(new THREE.Vector3(intersect.object.position.x, intersect.object.position.y, intersect.object.position.z));
                //        surfaceGeom.faces.push(
                //            new THREE.Face3(2,1,0)     //  use vertices of rank 2,1,0
                //            //new THREE.Face3(3,1,2)      //  vertices[3],1,2...
                //        );
                //    }
                //});
            },
            constructionReady: function() {
                return true;
            },
            processConstruction: function(e) {
                
                return shapeParts;
            },
            constructionEnding: function() {
                return clicks === 2;
            },
            endConstruction: function() {
                //surfaceMesh = new THREE.Mesh(surfaceGeom, surfaceMat);
                //cnvParams.scene.add(surfaceMesh);
                
                //cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
                shapeParts = [];
                clicks = 0;
                return mesh;
            },
            constructionNextStep: function() {
                clicks++;
            }
        };
    }
    
    function shapeConstructorFactory(cnvParams, shapes, shapes3D, cameraParams, updateCamera) {
        this.cnvParams = cnvParams;
        this.shapes = shapes;
        this.shapes_3D = shapes3D;
        this.cameraParams = cameraParams;
        this.updateCamera = updateCamera;
        
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
                case "_3DShape":
                    return get3DShapesConstructor(subtoolName,  this.cnvParams, mdown, mmove, this.shapes, this.shapes_3D);
                case "surfaces":
                    return getSurfacesConstructor(subtoolName,  this.cnvParams, mdown, mmove, this.shapes, this.shapes_3D);
                default:
                    return false;
            }
        }
    }
    
    Global.tools = Global.tools || {
        shapeConstructorFactory: shapeConstructorFactory
    };

})(jQuery, THREE, DSSGeometry);