"use strict";

// TODO:
// 1.

;(function($, THREE, Global) {
    
    let getPropsCountOf = Global.utils.getPropsCountOf,
        log = Global.utils.log;
    
    /**
     *  @class: GeometryEngine
     *  @description: transform, get and select shapes by id, point
     *                create, find shapes group for given shape
     *                get transform props for current shape
     */
    
    function GeometryEngine() {};
    
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
    
    //  private
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
    
    GeometryEngine.prototype.findConnectedShapesGroup = function(shape) {
        let connShapes = new Map();        
        this._findConnectedShapesGroup(shape, {}, connShapes);
        return connShapes;
    };
    
    GeometryEngine.prototype.getConnectedShapesGroupByPoint = function(p) {
        let connectedShapes = new Map(), _this = this,
        pickedID = _this.getShapeIDByPoint(p);
        if (pickedID !== -1) {
            connectedShapes =  _this.shapes.get(pickedID).connectedShapes;
        }
        //log(pickedID, connectedShapes);
        return connectedShapes;
    };
    
    GeometryEngine.prototype.getShapeIDByPoint = function(p) {
        let currentShape, _this = this, pickedID = -1;			
        for (var entry of _this.shapes) {
            currentShape = entry[1];
            //if (currentShape.className === "Text2d") {
            //    continue;
            //}
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
    
    GeometryEngine.prototype.anyShapeContains = function(p) {
        for (let entry of this.shapes) {
            if (entry[1].pointsHave({}, p) || entry[1].contains(p) || entry[1].boundaryContains([], p)) {
                return true;
            }
        }
        return false;
    };
    
    GeometryEngine.prototype.insideAnyShape = function(p) {
        for (let entry of this.shapes) {
            if (!entry[1].pointsHave({}, p) && !entry[1].boundaryContains([], p) && entry[1].contains(p) ) {
                return true;
            }
        }
        return false;
    };
    
    GeometryEngine.prototype.onAnyPointOfAnyShape = function(p) {
        for (let entry of this.shapes) {
            if (entry[1].pointsHave({}, p) ) {
                return true;
            }
        }
        return false;
    };
    
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
    
    GeometryEngine.prototype.transformShapes = function(transformProps, mdown, mmove) {
        for (let pickedID in transformProps) {
            let pickedShape = this.shapes.get(pickedID);
            if (pickedShape) {
                pickedShape.transform(transformProps[pickedID], mdown, mmove);
                if (transformProps[pickedID].translating) {
                    pickedShape.transformConnectedShapes(mdown, mmove);
                }
                pickedShape.advancedTransform(mdown, mmove);
                pickedShape.updateMidPoints(mdown, mmove);
            }
        }
    };
    
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