"use strict";

// TODO:
// 1.

;(function($, THREE, Global) {
    
    let getPropsCountOf = Global.utils.getPropsCountOf,
        log = Global.utils.log;
    
    /**
     * @class: GeometryEngine
     * transform, get and select shapes by id or point, create, find shapes group for given shape, get transform properties for shape
     * emphasize, unemphasize boundaries or points
     */    
    function GeometryEngine() {};
    
    /** 
     * finds all connected shapes to constructedShape and connects with them
     * @param {Object} constructedShape - instance of a base class Shape (can be any of its derived ones)
     */
    GeometryEngine.prototype.createConnectedShapesGroup = function(constructedShape) {
        if (!constructedShape) {
            throw("can't create shapes group for undefined shape");
        }
        let connectedShapes = this.findConnectedShapesGroup(constructedShape);
        constructedShape.attach(constructedShape);
        connectedShapes.forEach(function(connectedShape) {
            constructedShape.attach(connectedShape);
        });
        constructedShape.connectedShapes.forEach(function(connectedShape) {
            connectedShape.attach(constructedShape);
            while (connectedShape.connectedShapes.size < constructedShape.connectedShapes.size) {
                constructedShape.connectedShapes.forEach(function(connectedShape_) {
                    connectedShape.attach(connectedShape_);
                });
            }
        });
    };
    
    /** 
     * recursively finds all shapes connected to shape storing result in connShapes (helper for findConnectedShapesGroup method)
     * @param {Object} shape - instance of a base class Shape (can be any of its derived ones)
     * @param {Object} picked - plain javascript hash object which indicates what shape is already has been visited/picked - {shapeID : 1}, if shape isn't visited shapeID propery is undefined
     * @param {Map}    connShapes - es6 Map object, stores all found connected shapes for shape
     */
    GeometryEngine.prototype._findConnectedShapesGroup = function(shape, picked, connShapes) {
        if (!shape) {
            return;
        }
        for (let i = 0, p; i < shape.points.length; i++) {
            p = shape.points[i];
            let props = this.getShapesGroupTransformProps(p, false); 			
            for (let id in props) {
                connShapes.set(id, this.shapes.get(id));
                if (!picked[id]) {
                    picked[id] = 1;
                    this._findConnectedShapesGroup(this.shapes.get(id), picked, connShapes);
                }
            }
        }
    };
    
    /** 
     * return all shapes connected to shape storing result in connShapes internally calling recursive _findConnectedShapesGroup method which does all the job
     * @param {Object} shape - instance of a base class Shape (can be any of its derived ones)
     */
    GeometryEngine.prototype.findConnectedShapesGroup = function(shape) {
        let connShapes = new Map();        
        this._findConnectedShapesGroup(shape, {}, connShapes);
        return connShapes;
    };
    
    
    /** 
     * returns map Object of connected shapes by 2D point which belongs to one of picked shape 
     * @param {Object} p - point, instance of a base class Shape (but in this case must be Point)
     */
    GeometryEngine.prototype.getConnectedShapesGroupByPoint = function(p) {
        let connectedShapes = new Map(), _this = this,
        pickedID = _this.getShapeIDByPoint(p);
        if (pickedID !== -1) {
            connectedShapes =  _this.shapes.get(pickedID).connectedShapes;
        }
        return connectedShapes;
    };
    
    /**
     * returns id of the shape that has point p 
     * @param {Object} p - point, instance of a base class Shape (but in this case must be Point)
     */ 
    GeometryEngine.prototype.getShapeIDByPoint = function(p) {
        let currentShape, _this = this, pickedID = -1;			
        for (var entry of _this.shapes) {
            currentShape = entry[1];
            for (let i = 0; i < currentShape.points.length; i++) {
                if (currentShape.pointsHave({}, p)) {
                    pickedID = entry[0];
                    return pickedID;
                }
                if (currentShape.contains(p) || currentShape.boundaryContains([], p)) {
                    pickedID = entry[0];
                }
            }
        }
        return pickedID;
    };
    
    /**
     * checks if point p is a part(contains, inside or on the boundary) of first founded shape, false if no such shape found
     * @param {Object} p - point, instance of a base class Shape (but in this case must be Point)
     */
    GeometryEngine.prototype.anyShapeContains = function(p) {
        for (let entry of this.shapes) {
            if (entry[1].pointsHave({}, p) || entry[1].contains(p) || entry[1].boundaryContains([], p)) {
                return true;
            }
        }
        return false;
    };
    
    /**
     * returns first founded shape where point p is one of the boundary points of it, false if no such shape found
     * @param {Object} p - point, instance of a base class Shape (but in this case must be Point)
     */
    GeometryEngine.prototype.onAnyShapesBoundary = function(p) {
        for (let entry of this.shapes) {
            if (!entry[1].pointsHave({}, p) && (entry[1].boundaryContains([], p) || entry[1].onCurve && entry[1].onCurve({}, p) )) {
                return entry[1];
            }
        }
        return false;
    };
    
    /**
     * checks if point p is only inside of any shape,  false otherwise
     * @param {Object} p - point, instance of a base class Shape (but in this case must be Point)
     */
    GeometryEngine.prototype.insideAnyShape = function(p) {
        for (let entry of this.shapes) {
            if (!entry[1].pointsHave({}, p) && !entry[1].boundaryContains([], p) && entry[1].contains(p) ) {
                return true;
            }
        }
        return false;
    };
    
    /**
     * checks if point p is only inside of any shape,  false otherwise
     * @param {Object} p - point, instance of a base class Shape (but in this case must be Point)
     */
    GeometryEngine.prototype.onAnyPointOfAnyShape = function(p) {
        for (let entry of this.shapes) {
            if (entry[1].pointsHave({}, p) ) {
                return true;
            }
        }
        return false;
    };
    
    /**
     * collect all transformation information (user actions with the shape when clicking on canvas) of point p in shapesGroup, example: {line1: {translating: 1, p1: true}}
     * @param {Object} p - point, instance of a base class Shape (but in this case must be Point)
     * @param {Boolean} checkForTranslation - boolean value indicates wether it needs to check for translation
     * @param {Map} shapesGroup - es6 map object, stores shapes group for which grouped/single transformations should be applied
     */
    GeometryEngine.prototype.getShapesGroupTransformProps = function(p, checkForTranslation, shapesGroup) {
        shapesGroup = shapesGroup && shapesGroup.size > 0 ? shapesGroup : this.shapes;
        let transformProps = {}, _this = this, prevent = false;
        
        shapesGroup.forEach(function(currentShape, id) {
            currentShape.pointsHave(transformProps, p);            
            if (checkForTranslation) {
                prevent = false;
                shapesGroup.forEach(function(shapeWith, _id) {
                    if (id !== _id) {
                        let phave = shapeWith.pointsHave({}, p),
                            contains = shapeWith.contains(p);
                        if (phave && contains || phave && !contains) {
                            prevent = true;
                        }
                    }
                });
                if (!prevent && typeof transformProps[id] === 'undefined' && currentShape.contains(p)) {
                    transformProps[id] = {};
                    transformProps[id].translating = 1;
                }
            }
        });
        
        return transformProps;
    };
    
    /**
     * transform all shapes based on transformProps information for each shape
     * @param {Object} transformProps - plain javascript hash pobject, stores all transformation information (user actions with the shape when clicking on canvas) in shapesGroup
     * @param {Vec2} mdown - 2d vector stores mouse coordinates when mouse pressed
     * @param {Vec2} mmove - 2d vector stores mouse coordinates when mouse moving
     */
    GeometryEngine.prototype.transformShapes = function(transformProps, mdown, mmove) {
        for (let pickedID in transformProps) {
            let pickedShape = this.shapes.get(pickedID);
            if (pickedShape) {
                pickedShape.transform(transformProps[pickedID], mdown, mmove);
                
                if (transformProps[pickedID].translating || pickedShape.boundaryContainsOtherPoints) {
                    pickedShape.transformConnectedShapes(mdown, mmove);     //  consider translating as well
                }
                
                pickedShape.advancedTransform(mdown, mmove);
                pickedShape.updateMidPoints(mdown, mmove);                  //  save mid points as mid points when transforming
                pickedShape.points.forEach(function(p) {
                    if (p.isOnBoundary) {
                        p.connectedShapes.forEach(function(sh) {
                            sh.updateBoundaryPoints();
                            sh.transformConnectedShapes(mdown, mmove);
                        });
                    }
                });
            }
        }
    };
    
    /**
     * fixes point x and y coordinates to perfectly be equal to a first founded one
     * @param {Point} point - instance of a base class Shape (but in this case must be Point) 
     */
    GeometryEngine.prototype.stickPointToFounded = function(point) {
        for (let entry of this.shapes) {
            for (let i = 0; i < entry[1].points.length; i++) {
                if (entry[1].points[i].contains(point) && entry[1].points[i].isVisible) {
                    point.set(entry[1].points[i].x, entry[1].points[i].y);
                    //point = entry[1].points[i];
                    return entry[1].points[i];
                }
            }        
        }
        return 0;
    };
    
    /**
     * emphasizes all shapes points or boundaries that contains point p
     * @param {Point} p - instance of a base class Shape (but in this case must be Point) 
     */
    GeometryEngine.prototype.emphasizeShapes = function(p) {
        for (let entry of this.shapes) {
			if (entry[1].className !== "Text2d") {
                
                if (this.cnvParams.selectedShape && this.cnvParams.selectedShape.getID() === entry[0]) {
                    continue;
                }
                
				if (entry[1].className !== "Point") {
					if (entry[1].contains(p)) {                        
						entry[1].setBoundaryWidth( 2 );					
					} else {
						entry[1].setBoundaryWidth( 1 );
					}
					for (let i = 0; i < entry[1].points.length; i++) {
						entry[1].points[i].setBoundaryWidth(2);
					}
				}
                
				for (let i = 0; i < entry[1].points.length; i++) {
					if (entry[1].points[i].contains(p)) {
						entry[1].points[i].setBoundaryWidth(4);
						entry[1].className !== "Point" && entry[1].setBoundaryWidth( 1 );
					} else {
						entry[1].points[i].setBoundaryWidth(2);
					}
				}
                
			}
        }
    };
    
    /**
     * unemphasizes all shapes points and boundaries, except texts
     */
    GeometryEngine.prototype.unEmphasizeShapes = function() {
        for (let entry of this.shapes) {
            if (entry[1].className !== "Text2d") {
                if (entry[1].className !== "Point") {
                    entry[1].setBoundaryWidth(1);
                } else {
                    entry[1].setBoundaryWidth(2); 
                }
            }
        }
    }
    
    /**
     * emphasizes only shapes points that contains point p
     * @param {Point} p - instance of a base class Shape (but in this case must be Point) 
     */
    GeometryEngine.prototype.emphasizeShapesPoints = function(p) {
        for (let entry of this.shapes) {
            if (entry[1].className !== "Text2d") {
                for (let i = 0; i < entry[1].points.length; i++) {
                    if (entry[1].points[i].contains(p)) {
                        entry[1].points[i].setBoundaryWidth( 4 );
                        
                    } else {
                        entry[1].points[i].setBoundaryWidth( 2 );
                    }
                }        
            }
        }
    };
    
    /**
     * unemphasizes only shapes points that contains point p
     */
    GeometryEngine.prototype.unEmphasizeShapesPoints = function() {
        this.cnvParams.ctx.clearRect(0, 0, this.cnvParams.w, this.cnvParams.h);
        for (let entry of this.shapes) {
            if (entry[1].className !== "Text2d") {
                if (entry[1].className === "Point")
                    entry[1].setBoundaryWidth( 2 );
                for (let i = 0; i < entry[1].points.length; i++) {
                    entry[1].points[i].setBoundaryWidth( 2 );
                }            
            }
        }
    };

    Global.engine = Global.engine || {
        GeometryEngine : GeometryEngine
    };
    
})(jQuery, THREE, DSSGeometry);