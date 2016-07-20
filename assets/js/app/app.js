"use strict";

// TODO:
// 1. Proper transform step back and forward functionality !?

;(function($, THREE, Global) {
	
	let cnvParams,
		uiParams,
		shapes,
		shapes_3D,
		initial3DShapesRotation,
		deletedShapes,
		percent,
		actualWindowWidth,
		documentHeight,
		geometryEngine,
		
		log = Global.utils.log,
		getActualWinWidth = Global.utils.getActualWinWidth,
		radToDeg = Global.math.radToDeg,
		degToRad = Global.math.degToRad,
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
		createCoordinateSystem = Global.shapes.createCoordinateSystem,
		Vec2 = Global.math.Vec2,
		GeometryEngine = Global.engine.GeometryEngine,
		shapeConstructorFactory = Global.tools.shapeConstructorFactory;
		
	
	function initParams() {
		percent = 5;
		actualWindowWidth = getActualWinWidth();
		documentHeight = $(document).height();

		cnvParams = {};
		uiParams = {};
	
		cnvParams.cnv = $('#canvas2d');
		cnvParams.ctx = cnvParams.cnv[0].getContext('2d');
		cnvParams.renderer = window.WebGLRenderingContext ? new THREE.WebGLRenderer({antialias: true}) : new THREE.CanvasRenderer();
		cnvParams.cnv3D = $(cnvParams.renderer.domElement);
		cnvParams.scene = new THREE.Scene();
		cnvParams._3DviewEnabled = false;
		
		cnvParams.cnv2DOverlayContext = $("#canvas2DOverlay")[0].getContext('2d');
		
		cnvParams.transformHistory = [];
		cnvParams.historyIndex = 0;
		uiParams.topTools = $('.top-tool');
		uiParams.subTools = $('.sub-tools');
		uiParams.subTool = $('.sub-tool');
		uiParams.topToolsContainer = $("#top-tools-container");
		uiParams.topToolsContainerFullHeight = parseInt(uiParams.topToolsContainer.height()) +
				parseInt(uiParams.topToolsContainer.css("margin-top")) 	+ parseInt(uiParams.topToolsContainer.css("margin-bottom"))
			  + parseInt(uiParams.topToolsContainer.css("padding-top")) + parseInt(uiParams.topToolsContainer.css("padding-bottom"));
			  
		uiParams.reloadBtn = $(".reloadBtn");
		uiParams.undoBtn = $(".undoBtn");
		uiParams.redoBtn = $(".redoBtn");
		uiParams._3dviewCheckBox = $('#3dview-checkbox');
		uiParams.projectionSelect = $('#projection_select');
		
		cnvParams.cnv.attr("width", actualWindowWidth - (actualWindowWidth*percent)/100 );
		cnvParams.cnv.attr("height", documentHeight - uiParams.topToolsContainerFullHeight - 10);
		cnvParams.w = cnvParams.cnv.width();
		cnvParams.h = cnvParams.cnv.height();
		cnvParams.cnvOffsetX = (actualWindowWidth - cnvParams.w) / 2,
		cnvParams.cnvOffsetY = uiParams.topToolsContainerFullHeight;
		cnvParams.cnv.css({"left": cnvParams.cnvOffsetX, "top": cnvParams.cnvOffsetY});		
		uiParams.topToolsContainer.css({"width": cnvParams.w, "margin-left": cnvParams.cnvOffsetX});
	}
	
	function setUp3D() {
		$(uiParams._3dviewCheckBox).attr("checked", false);
		$("#render-canvases").append(cnvParams.renderer.domElement);
		cnvParams.camera = new THREE.OrthographicCamera(-cnvParams.w, cnvParams.w, cnvParams.h, -cnvParams.h, -2000, 2000);
		cnvParams.renderer.setSize(0, 0);
	}	
	
	function prepare3DShapes() {
		shapes.forEach(function(shape, shapeID) {
			if (!shapes_3D.has(shapeID) && shape.className !== "Text2d") {
				var shape_3D = shape.createMeshFromThis();
				shapes_3D.set(shapeID, shape_3D);
			}
		});
		
		cnvParams.scene.rotation.set(initial3DShapesRotation.x, initial3DShapesRotation.y, initial3DShapesRotation.z);
	}
	
	function setUpGlobalEvents() {
		$(window).resize(initParams);
		let factor = 2, bothCanvasesWidth = cnvParams.w, cnv3DWidth;
				
		uiParams._3dviewCheckBox.click(function(e) {
			cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);
			if (uiParams._3dviewCheckBox.is(':checked')) {
				uiParams.projectionSelect.removeAttr("disabled");
				cnvParams._3DviewEnabled = true;
				cnvParams.cnv.attr("width", actualWindowWidth/factor - ((actualWindowWidth/factor)*percent)/100 );
				cnvParams.w = cnvParams.cnv.width();		
				cnv3DWidth = bothCanvasesWidth - cnvParams.w - 5;
				
				if (uiParams.projectionSelect.val() === "persp") {
					cnvParams.camera = new THREE.PerspectiveCamera(45, cnv3DWidth/cnvParams.h, 1, 3000);
					cnvParams.camera.position.z = 1900;
				} else {
					cnvParams.camera = new THREE.OrthographicCamera(-cnv3DWidth, cnv3DWidth, cnvParams.h, -cnvParams.h, -2000, 2000);
				}
				cnvParams.camera.lookAt(new THREE.Vector3(0, 0, 0));					
				
				cnvParams.renderer.setSize(cnv3DWidth, cnvParams.h);
				cnvParams.renderer.setClearColor(0xffffff, 1);
				cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
				$(cnvParams.renderer.domElement).css({"margin-left": cnvParams.w + cnvParams.cnvOffsetX + 5, "margin-top": 1});
				
				$("#canvas2DOverlay").attr("width", cnv3DWidth);
				$("#canvas2DOverlay").attr("height", cnvParams.h);
				$("#canvas2DOverlay").css({"left": parseFloat($(cnvParams.renderer.domElement).css("margin-left")), "top" : uiParams.topToolsContainerFullHeight});				
				var scene = cnvParams.scene;
				var	renderer = cnvParams.renderer;
				var light1 = new THREE.PointLight(0xffffff, 1, 5000);
				var light2 = new THREE.PointLight(0xffffff, 1, 5000);
				var coordSystem = createCoordinateSystem(cnv3DWidth, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0x444678, 0x444678, 0x444678));
				light1.name = "light1"; light2.name = "light2";
				coordSystem.name = "coordSystem";
				light1.position.set(500, 500, 700);
				light1.intensity = 1;
				light2.position.set(-500, -500, 700);
				light2.intensity = 1;
				scene.add(light1);	
				scene.add(light2);
				scene.add(coordSystem);				
				
				Shape.prototype.cnvW = cnv3DWidth;
				Shape.prototype.camera = cnvParams.camera;
				
				prepare3DShapes();
				scene.children[3].matrixWorldNeedsUpdate = true;
				renderer.render(scene,  cnvParams.camera);			//	initial rendering		
				cnvParams.cnv3D.off("mousedown");
				cnvParams.cnv3D.off("mousemove");
				cnvParams.cnv3D.off("mouseup");
				$("#canvas2DOverlay").off("mousedown");
				$("#canvas2DOverlay").off("mousemove");
				$("#canvas2DOverlay").off("mouseup");
				var _90deginRad = Math.PI * 0.5;
				var onmousedown = function(e) {
					var mouse = new Vec2(),
						lastX, lastY;
						mouse.set(e.clientX - cnvParams.w - cnvParams.cnvOffsetX - 5, e.clientY - cnvParams.cnvOffsetY);
					var lastX = mouse.x,
						lastY = mouse.y,
						diffX, diffY,
						rx, ry;
					
					var onmmove = function(e) {
						mouse.set(e.clientX - cnvParams.w - cnvParams.cnvOffsetX - 5, e.clientY - cnvParams.cnvOffsetY);
						diffX = mouse.x - lastX;
						diffY = mouse.y - lastY;
						
						rx = diffY / 200;
						ry = diffX / 200;
						
						scene.rotation.x += rx;
						if (scene.rotation.x > _90deginRad) {
							scene.rotation.x = _90deginRad;
						}
						if (scene.rotation.x < -_90deginRad) {
							scene.rotation.x = -_90deginRad;
						}
						
						//scene.children[3].matrixWorldNeedsUpdate = true;
						//log(scene.children[3].matrixWorld);
						scene.rotation.y += ry;
						renderer.render(scene,  cnvParams.camera);
						lastX = mouse.x;
						lastY = mouse.y;
					}
					var onmup = function(e) {
						cnvParams.cnv3D.off("mousemove");
						cnvParams.cnv3D.off("mouseup");
						$("#canvas2DOverlay").off("mousemove");
						$("#canvas2DOverlay").off("mouseup");	
						initial3DShapesRotation.set(scene.rotation.x, scene.rotation.y, 0);
						Shape.prototype.camera = cnvParams.camera;
					}
					
					cnvParams.cnv3D.mousemove(onmmove);
					$("#canvas2DOverlay").mousemove(onmmove);					
					cnvParams.cnv3D.mouseup(onmup);
					$("#canvas2DOverlay").mouseup(onmup);
				}
				cnvParams.cnv3D.mousedown(onmousedown);
				$("#canvas2DOverlay").mousedown(onmousedown);
				
			} else {
				uiParams.projectionSelect.attr("disabled", true);
				cnvParams.scene.remove(cnvParams.scene.getObjectByName("light1"));
				cnvParams.scene.remove(cnvParams.scene.getObjectByName("light2"));
				cnvParams.scene.remove(cnvParams.scene.getObjectByName("coordSystem"));
				cnvParams._3DviewEnabled = false;
				cnvParams.cnv.attr("width", actualWindowWidth - (actualWindowWidth*percent) / 100 );
				cnvParams.w = cnvParams.cnv.width();				
				cnvParams.renderer.setSize(0, 0);
			}
			Shape.prototype._3DviewEnabled = cnvParams._3DviewEnabled;
			renderShapes();
		});
		
		uiParams.projectionSelect.change(function(e) {
			if ($(this).val() === "ortho") {
				cnvParams.camera = new THREE.OrthographicCamera(-cnv3DWidth, cnv3DWidth, cnvParams.h, -cnvParams.h, -2000, 2000);
				cnvParams.renderer.setSize(cnv3DWidth, cnvParams.h);
				cnvParams.camera.lookAt(new THREE.Vector3(0, 0, 0));
			
			} else if ($(this).val() === "persp") {
				cnvParams.camera = new THREE.PerspectiveCamera(45, cnv3DWidth/cnvParams.h, 1, 3000);
				cnvParams.camera.position.z = 1900;
			}
			
			cnvParams.camera.lookAt(new THREE.Vector3(0, 0, 0));
			cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
		});
		
		//	spectrum events handling
		$("#selected-shape-colorpicker").spectrum({
			color: "#000",
			showButtons: false,
			move: function (color) {
				if (cnvParams.selectedShape) {
					cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);					
					cnvParams.selectedShape.setRenderAttribs({
						strokeStyle: color.toHexString(),
						fillColor: color.toHexString(),
						lineWidth: cnvParams.selectedShape.getBoundaryWidth()
					});					
					renderShapes();
				}
			},
			change: function(color) {}
		});
		$("#selected-shape-colorpicker").spectrum('disable');
		
		$( "#selected-shape-opacity-slider" ).slider({
			range: "min",
			min: 0,
			max: 1,
			value: 1,
			step: 0.01,
			slide: function( event, ui ) {
				if (cnvParams.selectedShape) {
					cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);					
					if (cnvParams.selectedShape.className !== "Text2d") {
						$("#selected-shape-opacity-amount").val(ui.value);
						cnvParams.selectedShape.setOpacity(parseFloat(ui.value));    
					} else {
						//	...
					}
					
					renderShapes();
				}			
			}
		});
		
		$("#selected-shape-opacity-amount").val($( "#selected-shape-opacity-slider" ).slider("value"));
		$("#selected-shape-opacity-slider").slider("disable");
		
		function deleteShape() {
			if (cnvParams.selectedShape) {
				let selID = cnvParams.selectedShape.getID();
				if (shapes.has(selID)) {
					cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);
					let shapesGroup = cnvParams.selectedShape.connectedShapes;					
					shapesGroup.forEach(function(sh) {
						sh.detach(selID);
					});
					
//					if (Shape.nextLetterIndex > 0) {
//                        Shape.nextLetterIndex--;
//                    }
					
					shapes.delete(selID);
					for (let entry of shapes) {
						entry[1].connectedShapes.clear();
						geometryEngine.createConnectedShapesGroup(entry[1]);
					}
							  
					if (shapes_3D.has(selID)) {
						shapes_3D.delete(selID);
					}
					var rObj = cnvParams.scene.getObjectByName(selID);
						cnvParams.scene.remove(rObj);
						cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
						renderShapes();
						cnvParams.selectedShape = 0;
						disableSelectedShapeAttribControls();
				}
			}
		}
		
		$("#selected-shape-delete-btn").click(deleteShape);
		$("body").keydown(function(e){
			var letter = String.fromCharCode(e.which);
			if (e.keyCode === 46) {
				deleteShape();
			}
		});
		
		$("#selected-shape-delete-btn").attr('disabled', 'disabled');
	}
	
	function initShapes() {
		shapes 		  = new Map();
		shapes_3D	  = new Map();
		deletedShapes = new Map();
		initial3DShapesRotation = new THREE.Vector3(0.4, 0.5, 0.0);
		Shape.prototype.ctx = cnvParams.ctx;
		Shape.prototype.cnv = cnvParams.cnv;
		Shape.prototype.cnvParams = cnvParams;
		Shape.prototype.cnv2DOverlayContext = cnvParams.cnv2DOverlayContext;
		Shape.prototype.cnvW = cnvParams.w;
		Shape.prototype.cnvH = cnvParams.h;
		Shape.prototype.cnvOffsetX = cnvParams.cnvOffsetX;
		Shape.prototype.cnvOffsetY = cnvParams.cnvOffsetY;
		Shape.prototype._3DviewEnabled = cnvParams._3DviewEnabled;
		Shape.prototype.scene = cnvParams.scene;
		Shape.prototype.camera = cnvParams.camera;
		Shape.prototype.shapes = shapes;
		Shape.prototype.geometryEngine = new GeometryEngine();
	}
	
	function initGeometryEngine() {
		GeometryEngine.prototype.cnvParams = cnvParams;
		GeometryEngine.prototype.shapes = shapes;
		geometryEngine = new GeometryEngine();
	}
	
	function updateUI(toolName) {
		uiParams.topTools.removeClass("selected");
		uiParams.subTools.css({"visibility" : "hidden"});		
		$("." + toolName).addClass("selected");		
		$("." + toolName).find(".sub-tools").css({"visibility" : "visible"});
	}
	
	function resetUIToDefaults() {
		uiParams.topTools.removeClass("selected");
		uiParams.subTools.css({"visibility": "hidden"});
	}
	
	function disableSelectedShapeAttribControls() {
		$("#selected-shape").html("");
		$("#selected-shape-colorpicker").spectrum('disable');
		$("#selected-shape-colorpicker").spectrum("set", "#000");
		$("#selected-shape-colorpicker").spectrum("hide");
		$("#selected-shape-opacity-amount").val(1);
		$("#selected-shape-opacity-slider").slider('value', 1);
		$("#selected-shape-opacity-slider").slider("disable");
		$("#selected-shape-delete-btn").attr('disabled', 'disabled');
	}
	
	function enableSelectedShapeAttribControls() {
		$("#selected-shape").html(cnvParams.selectedShape.getID());
		$("#selected-shape-colorpicker").spectrum('enable');
		$("#selected-shape-colorpicker").spectrum("set", cnvParams.selectedShape.getFillColor());
		$("#selected-shape-opacity-amount").val( cnvParams.selectedShape.getOpacity() );
		$("#selected-shape-opacity-slider").slider('value', cnvParams.selectedShape.getOpacity());
		$("#selected-shape-opacity-slider").slider("enable");
		$("#selected-shape-delete-btn").removeAttr('disabled');	//	enable delete button
	}
	
	function setupTools() {
		$(".buttons, .top-tool, .sub-tools").disableSelection();
		uiParams.topTools.click(function(e) {
			offHandlers();
			e.stopPropagation();
			uiParams.selectedToolName = e.currentTarget.className.split(" ")[1];
			updateUI(uiParams.selectedToolName);
			disableSelectedShapeAttribControls();
			
			if (uiParams.selectedToolName !== "move") {				
				uiParams.activeSubToolName = $("." + uiParams.selectedToolName).find(".active-subtool")[0].className.split(" ")[1];
			} else {
				//cnvParams.selectedShape = 0;
				cnvParams.cnv.mousemove(emphasizeShapes);
			}
			
			if ($(e.currentTarget).attr("data-tool-type") === "constructor") {
				constructionLoop(e, uiParams.selectedToolName, uiParams.activeSubToolName);		
				uiParams.selectedToolType = "constructor";
			}
			
			if ($(e.currentTarget).attr("data-tool-type") === "transformer") {
				transformLoop(e, uiParams.selectedToolName);	
				uiParams.selectedToolType = "transformer";
			}
			
			uiParams.subTool.click(function(e) {
				offHandlers();
				e.stopPropagation();
				uiParams.subTools.css({"visibility": "hidden"});
				uiParams.activeSubToolName = e.currentTarget.className.split(' ')[1]
				
				if (uiParams.selectedToolType === "constructor") {
					constructionLoop(e, uiParams.selectedToolName, uiParams.activeSubToolName);		
				}
				
				let defTool = $("." + uiParams.selectedToolName).find(".active-subtool");
				defTool.find("img").attr("src", $(e.currentTarget).find("img").attr("src"));
				defTool.attr("class", "active-subtool " + uiParams.activeSubToolName);
			});
		});
	}
	
	function setCurrentLoopStep(historyData) {
		let cnvImg = new Image();
		cnvImg.src = historyData[0];			
		cnvImg.onload = function() {
			cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);
			cnvParams.ctx.drawImage(cnvImg, 0, 0);
		};
		
		for (let entry of historyData[1]) {
			let shape = shapes.get(entry[0]);
			if (shape) {				
				for (let i = 0; i < shape.points.length; i++) {
					shape.points[i].set(entry[1][i].x, entry[1][i].y);    
				}				
			}
		}
//		GeometryEngine.prototype.shapes = shapes;
//		for (let entry of shapes) {
//            entry[1].connectedShapes.clear();
//			GeometryEngine.prototype.createConnectedShapesGroup(entry[1]);
//        }
	}
	
	function saveCurrentTransformStep(same) {
		if (same) {
			cnvParams.transformHistory.pop();
		}
		let transformedPoints = new Map(), pointsCopy;
		for (let entry of shapes) {
			pointsCopy = [];
			for (let i = 0; i < entry[1].points.length; i++) {
				pointsCopy.push( entry[1].points[i].copy() );
			}
			transformedPoints.set(entry[0], pointsCopy);
		}
		cnvParams.transformHistory.push( [cnvParams.cnv[0].toDataURL(), transformedPoints] );
		cnvParams.historyIndex = cnvParams.transformHistory.length - 2;
	}
	
	function setupHistory() {
		uiParams.reloadBtn.click(function() {
			cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);
			cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);	
			resetUIToDefaults();
			disableSelectedShapeAttribControls();
			offHandlers();
			shapes.forEach(function(sh, id) {
				cnvParams.scene.remove(cnvParams.scene.getObjectByName(id));	
			});
			cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
			shapes.clear();
			shapes_3D.clear();
			deletedShapes.clear();
			cnvParams.transformHistory = [];
			Line.count = Ray.count = Segment.count = Vector.count = Polygon.count = 
			Triangle.count = RegularPolygon.count = Circle.count = Point.count = Text2d.count = 0;
			Shape.nextLetterIndex = 0;
			Shape.letterIndexMark = 0;
		});
//		uiParams.undoBtn.click(function() {
//			cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);
//			if (cnvParams.historyIndex >= cnvParams.transformHistory.length) {
//                cnvParams.historyIndex = cnvParams.transformHistory.length - 2;
//            }
//			if (cnvParams.historyIndex >= 0) {
//				let historyData = cnvParams.transformHistory[cnvParams.historyIndex--];
//				setCurrentLoopStep(historyData);	
//            } else {
//				//let lastShapeID = shapes.getLastKey();
//				//if (lastShapeID) {
//				//	deletedShapes.set(lastShapeID, shapes.get(lastShapeID));					
//				//	//fix detaching
//				//	//for (let entry of shapes.get(lastShapeID).connectedShapes) {
//				//	//	entry[1].detach(lastShapeID);						
//				//	//}
//				//	shapes.delete(lastShapeID);
//				//}
//			}
//			renderShapes();
//		});
//		
//		uiParams.redoBtn.click(function() {
//			cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);
//			if (cnvParams.historyIndex < 0) {
//                cnvParams.historyIndex = 1;
//            }			
//			if (cnvParams.historyIndex < cnvParams.transformHistory.length) {
//				let historyData = cnvParams.transformHistory[cnvParams.historyIndex++];				
//				setCurrentLoopStep(historyData);  
//            } else {
//				//let lastShapeID = deletedShapes.getLastKey();
//				//if (lastShapeID) {
//				//	shapes.set( lastShapeID, deletedShapes.get(lastShapeID) );
//				//	deletedShapes.delete(lastShapeID);
//				//}
//            }
//			renderShapes();
//		});
	}
	
	function emphasizeShapes(e) {
		let mmove = new Vec2();
		mmove.set(e.clientX - cnvParams.cnvOffsetX, e.clientY - cnvParams.cnvOffsetY);
		cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);		
		geometryEngine.emphasizeShapes(mmove);
		renderShapes();
	}
	
	function constructionLoop(e, toolName, subToolName) {
		let shape,
			shapeParts,
			mdown = new Vec2(),
			mmove = new Vec2(),
			shapeConstructor = new shapeConstructorFactory(cnvParams, shapes)
				.getConstructor(toolName, subToolName, mdown, mmove);		
		
		if (!shapeConstructor) {
			log("no such shape's constructor exists");
			return;
		}
		
		cnvParams.cnv.mousedown(function(e) {
			cnvParams.transformHistory = [];
			uiParams.subTools.css({"visibility" : "hidden"});
			e.stopPropagation();
			mdown.set(e.clientX - cnvParams.cnvOffsetX, e.clientY - cnvParams.cnvOffsetY);
			shapeConstructor.initConstruction();			
			if (!shapeConstructor.constructionReady()) {
				return false;
			}
			if (shapeConstructor.constructionStarted()) {
				cnvParams.cnv.mousemove(function(e) {
					cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);					
					geometryEngine.emphasizeShapesPoints(mmove);					
					shapeParts = shapeConstructor.processConstruction(e);
					renderShapes();
					if (shapeParts) {
						shapeParts.forEach(function(shape) {
							shape && shape.render();
						});
					}
				});
			}
			if (shapeConstructor.constructionEnding()) {
				cnvParams.cnv.off("mousemove");
				shape = shapeConstructor.endConstruction();
				if (!shape) {
					log("shape is not created");
					return;
				}
				shapes.set(shape.getID(), shape);
				geometryEngine.unEmphasizeShapesPoints();
				geometryEngine.unEmphasizeShapes();
				cnvParams.selectedShape = shape;
				shape.createLetters();
				if (cnvParams.selectedShape.className !== "Point" && cnvParams.selectedShape.className !== "Text2d") {
					cnvParams.selectedShape.setBoundaryWidth(2);
				} else if (cnvParams.selectedShape.className === "Point") {
					cnvParams.selectedShape.setBoundaryWidth(4);
				}
				enableSelectedShapeAttribControls();
				if (cnvParams._3DviewEnabled) {
					prepare3DShapes();
				}
				//console.log(shapes);
				//console.log(shapes_3D);
				//log(cnvParams.scene.children)
				cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
				renderShapes();
				return;
			}
			shapeConstructor.constructionNextStep();
		});
	}
	
	function transformLoop(e, toolName) {
		let mdown = new Point(new Vec2(), 2),
			mmove = new Point(new Vec2(), 2),
			transformProps = {},
			useOldTransformProps = 0,
			connectedShapesGroup = 0,
			pointShape,
			selShape;
			
		cnvParams.cnv.mousedown(function(e) {
			mdown.set(e.clientX - cnvParams.cnvOffsetX, e.clientY - cnvParams.cnvOffsetY);
			connectedShapesGroup = geometryEngine.getConnectedShapesGroupByPoint(mdown);
			cnvParams.selectedShape = shapes.get(geometryEngine.getShapeIDByPoint(mdown));
			selShape = cnvParams.selectedShape;
			pointShape = 0;
			for (let entry of shapes) {
				for (let i = 0; i < entry[1].points.length; i++) {
					if (entry[1].points[i].contains(mdown)) {
						cnvParams.selectedShape = entry[1].points[i];
						break;
					}
				}
			}
			
			if (cnvParams.selectedShape) {
				if (cnvParams.selectedShape.className !== "Point" && cnvParams.selectedShape.className !== "Text2d") {
					cnvParams.selectedShape.setBoundaryWidth(2);
				} else if (cnvParams.selectedShape.className === "Point") {
					cnvParams.selectedShape.setBoundaryWidth(4);
				}
				enableSelectedShapeAttribControls();
			} else {
				disableSelectedShapeAttribControls();
				geometryEngine.unEmphasizeShapes();
				cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);
				renderShapes();
			}
				  
			if (!useOldTransformProps) {                	
				transformProps = geometryEngine.getShapesGroupTransformProps(mdown, true, connectedShapesGroup);
			}
			
			if (!$.isEmptyObject(transformProps)) {
				//saveCurrentTransformStep(true);
				cnvParams.cnv.css({"cursor": "pointer"});
				cnvParams.cnv.mousemove(function(e) {
					mmove.set(e.clientX - cnvParams.cnvOffsetX, e.clientY - cnvParams.cnvOffsetY);
					cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);
					geometryEngine.transformShapes(transformProps, mdown, mmove);
					cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
					renderShapes();
				});
				cnvParams.cnv.mouseup(function() {
					cnvParams.cnv.css({"cursor": "auto"});
					cnvParams.cnv.off('mousemove');
					cnvParams.cnv.off('mouseup');
					cnvParams.cnv.mousemove(emphasizeShapes);
					//saveCurrentTransformStep();
					useOldTransformProps = 0;					
					if (selShape && connectedShapesGroup && connectedShapesGroup.size > 0) {
						for (let i = 0; i < selShape.points.length; i++) {
							connectedShapesGroup.forEach(function(sh) {
								//if (!transformProps[sh.getID()] && (sh.pointsHave({}, mmove))) {
								//	useOldTransformProps = 1;
								//}								
								//if (useOldTransformProps) {	return;	}
								for (let j = 0; j < sh.points.length; j++) {
									if (selShape.points[i].contains(sh.points[j]) && selShape.points[i] != sh.points[j]) {
										useOldTransformProps = 1;
									}
								}
							});
						}
					}					
				});
			}
		});
	}
	
	function offHandlers() {
		cnvParams.cnv.off("mousedown");
		cnvParams.cnv.off("mousemove");	
		cnvParams.cnv.off("mouseup");
		//cnvParams.cnv3D.off("mousedown");
		//cnvParams.cnv3D.off("mousemove");
		//cnvParams.cnv3D.off("mouseup");
		cnvParams.cnv.off("click");
		uiParams.subTool.off("click");
	}
	
	//	renders shapes to 2D canvas only
	function renderShapes() {
		shapes.forEach(function(shape, shapeID) {
			shape.render();
		});
	}
	
	function setup() {
		setUpGlobalEvents();
		setupHistory();
		setupTools();
		setUp3D();
	}
	
	Global.app = Global.app || {
		initParams : initParams,
		initShapes : initShapes,
		initGeometryEngine: initGeometryEngine,
		setup :	setup	
	};
	
})(jQuery, THREE, DSSGeometry);