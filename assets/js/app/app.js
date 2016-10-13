"use strict";

// TODO:
//	1. Find intersection points of object and surface
//	2. Fix issue with designations projection on overlay2D cavnas

;(function($, THREE, Global) {
	
	let
		/**
		 * @description - plain hash object, stores both 2d and 3d canvas parameters including three.js renderer camera and scene
		 */
		cnvParams,
		
		/**
		 * @description - plain hash object, stores user interface parameters
		 */
		uiParams,
		
		/**
		 * @description - plain hash object, stores only camera parameters
		 */
		cameraParams,
		
		/**
		 * @function updateCamera - updates camera transformation (position and target vector)
		 */
		updateCamera,
		
		/**
		 * Shapes {Object Map} - stores all 2d shapes as {key: shapeID => value: shapeInstance}
		 */
		shapes,
		
		/**
		 * Shapes_3D {Object Map} - stores all 3d shapes as {key: shapeID => value: shapeInstance}
		 */
		shapes_3D,
		
		/**
		 * percent {Number} - value in percentage - shows how much its needed to squeeze canvases width
		 */
		percent,
		
		/**
		 * actualWindowWidth {Number} - actual window width
		 */
		actualWindowWidth,
		
		/**
		 * windowHeight {Number} - window height
		 */
		windowHeight,
		
		/**
		 * geometryEngine {Object} - an instance of GeometryEngine class
		 * @see GeometryEngine - in engine.js
		 */
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
		updateCoordSystemNumbers = Global.shapes.updateCoordSystemNumbers,
		Vec2 = Global.math.Vec2,
		GeometryEngine = Global.engine.GeometryEngine,
		shapeConstructorFactory = Global.tools.shapeConstructorFactory;
		
	/**
	 * @function initParams - fills all params object with appropriate values,
	 * initializes app width and camera parameters
	 */
	function initParams() {
		percent = 5;
		actualWindowWidth = getActualWinWidth();
		windowHeight = $(window).height();

		cnvParams = {};
		uiParams = {};
	
		cnvParams.cnv = $('#canvas2d');
		cnvParams.ctx = cnvParams.cnv[0].getContext('2d');
		cnvParams.renderer = window.WebGLRenderingContext ? new THREE.WebGLRenderer({antialias: true}) : new THREE.CanvasRenderer();
		cnvParams.cnv3D = $(cnvParams.renderer.domElement);
		cnvParams.scene = new THREE.Scene();
		cnvParams._3DviewEnabled = false;
		
		cnvParams.cnv2DOverlay = $("#canvas2DOverlay");
		cnvParams.cnv2DOverlayContext = cnvParams.cnv2DOverlay[0].getContext('2d');

		uiParams.topTools = $('.top-tool');
		uiParams.subTools = $('.sub-tools');
		uiParams.subTool = $('.sub-tool');
		uiParams.topToolsContainer = $("#top-tools-container");
		uiParams.topToolsContainerFullHeight = parseInt(uiParams.topToolsContainer.height()) +
				parseInt(uiParams.topToolsContainer.css("margin-top")) 	+ parseInt(uiParams.topToolsContainer.css("margin-bottom"))
			  + parseInt(uiParams.topToolsContainer.css("padding-top")) + parseInt(uiParams.topToolsContainer.css("padding-bottom"));
			  
		uiParams.reloadBtn = $(".reloadBtn");
		uiParams._3dviewCheckBox = $('#3dview-checkbox');
		uiParams.projectionSelect = $('#projection_select');
		uiParams._3DShapesTools = $("._3DShape");
		uiParams.surfaceShapesTools = $(".surfaces");
		
		cnvParams.cnv.attr("width", actualWindowWidth - (actualWindowWidth*percent)/100 );
		cnvParams.cnv.attr("height", windowHeight - uiParams.topToolsContainerFullHeight - 10);
		cnvParams.w = cnvParams.cnv.width();
		cnvParams.h = cnvParams.cnv.height();
		cnvParams.bothCanvasesWidth = cnvParams.w;
		cnvParams.cnvOffsetX = (actualWindowWidth - cnvParams.w) / 2,
		cnvParams.cnvOffsetY = uiParams.topToolsContainerFullHeight;
		cnvParams.cnv.css({"left": cnvParams.cnvOffsetX, "top": cnvParams.cnvOffsetY});
		uiParams.topToolsContainer.css({"width": cnvParams.w, "margin-left": cnvParams.cnvOffsetX});
		cameraParams = {
			distance : 1,
			newTarget: new THREE.Vector3(),
			mdown:	   new THREE.Vector2(),
			mmove: 	   new THREE.Vector2(),
			phi:   	   25,
			theta:	  -15,
			phim:	   0,
			thetam:	   0,
			fov:	   53
		};
	}
	
	/**
	 * @function setUp3D - creates 3d canvas html element, sets up camera, renderer and updateCamera function
	 */
	function setUp3D() {
		$(uiParams._3dviewCheckBox).attr("checked", false);
		$("#render-canvases").append(cnvParams.renderer.domElement);
		cnvParams.camera = new THREE.OrthographicCamera(-cnvParams.w, cnvParams.w, cnvParams.h, -cnvParams.h, -2000, 2000);
		cnvParams.renderer.setSize(0, 0);
		updateCamera = function() {
			if (!cnvParams.camera) {
                log("cnvParams.camera is falsy");
				return;
            }
			cnvParams.camera.position.x = cameraParams.distance * Math.sin(cameraParams.theta * degToRad) * Math.cos(cameraParams.phi * degToRad);
			cnvParams.camera.position.y = cameraParams.distance * Math.sin(cameraParams.phi * degToRad);
			cnvParams.camera.position.z = cameraParams.distance * Math.cos(cameraParams.theta * degToRad) * Math.cos(cameraParams.phi * degToRad);						

			cameraParams.newTarget.set(-cnvParams.camera.position.x, -cnvParams.camera.position.y, -cnvParams.camera.position.z);
			cnvParams.camera.lookAt(cameraParams.newTarget);
			cnvParams.camera.updateProjectionMatrix();			
			Shape.prototype.camera = cnvParams.camera;
		};
	}
	
	/**
	 * @function prepare3DShapes - creates THREE.Object3D objects for 2d shape and fills shapes_3D
	 */
	function prepare3DShapes() {
		shapes.forEach(function(shape, shapeID) {
			if (!shapes_3D.has(shapeID) && shape.className !== "Text2d") {
				let shape_3D = shape.createMeshFromThis();
				shapes_3D.set(shapeID, shape_3D);
			}
		});
	}
	
	/**
	 * @function setUP3DView - sets everything needed for 3d stuff including light, 3d coord system, user input
	 * @param cnv3DWidth {Number} - width of the 3d canvas
	 */
	function setUP3DView(cnv3DWidth) {
        if (uiParams.projectionSelect.val() === "persp") {
			cnvParams.camera = new THREE.PerspectiveCamera(cameraParams.fov, cnv3DWidth/cnvParams.h, 1, 3000);
			cnvParams.camera.position.z = 1880;
			cameraParams.distance = cnvParams.camera.position.length();
		} else {
			cnvParams.camera = new THREE.OrthographicCamera(-cnv3DWidth, cnv3DWidth, cnvParams.h, -cnvParams.h, -2000, 2000);
			cameraParams.distance = 1;
		}
		$(cnvParams.renderer.domElement).css({"margin-left": cnvParams.w + cnvParams.cnvOffsetX + 5, "margin-top": 1});
		
		cnvParams.cnv2DOverlay.attr("width", cnv3DWidth);
		cnvParams.cnv2DOverlay.attr("height", cnvParams.h);
		cnvParams.cnv2DOverlay.css({"left": parseFloat($(cnvParams.renderer.domElement).css("margin-left")), "top" : uiParams.topToolsContainerFullHeight});		
				
		cameraParams.light1 = new THREE.DirectionalLight(0xffffff, 0.3);
		cameraParams.light1.name = "light1";
		cameraParams.light1.position.set(500, 500, 100);
		
		if (cnvParams.scene.getObjectByName("light1") === undefined) {
			cnvParams.scene.add(cameraParams.light1);    
        }		
		
		//depthWrite: false
		let xzPlaneGeom = new THREE.PlaneBufferGeometry(2*cnv3DWidth - 100, 2*cnv3DWidth - 100);
		let xzPlaneMat = new THREE.MeshLambertMaterial({color: 0x11ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.4, depthTest: false});
		let xzPlaneMesh = new THREE.Mesh(xzPlaneGeom, xzPlaneMat);
		xzPlaneMesh.name = "xzPlane";
		if (cnvParams.scene.getObjectByName("xzPlane") === undefined) {
			xzPlaneMesh.rotation.x = Math.PI / 2;
			cnvParams.scene.add(xzPlaneMesh);   
        }
		
		Shape.prototype.cnvW = cnv3DWidth;
		Shape.prototype.camera = cnvParams.camera;
		
		cnvParams.renderer.setSize(cnv3DWidth, cnvParams.h);
		cnvParams.renderer.setClearColor(0xffffff, 1);
		
		prepare3DShapes();
		updateCamera();
		create3DInteractivities();
		
		let coordSystem = createCoordinateSystem(cnv3DWidth, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0x444678, 0x444678, 0x444678), cnvParams);
		coordSystem.name = "coordSystem";
		if (cnvParams.scene.getObjectByName("coordSystem") === undefined) {
			cnvParams.scene.add(coordSystem);   
        }
		updateCoordSystemNumbers(cnvParams);
		cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);			//	initial rendering
    }
	
	/**
	 * @function create3DInteractivities - sets up mouse events for 3d canvas
	 */
	function create3DInteractivities() {
        cnvParams.cnv3D.off("mousedown");
		cnvParams.cnv3D.off("mousemove");
		cnvParams.cnv3D.off("mouseup");
		$("#canvas2DOverlay").off("mousedown");
		$("#canvas2DOverlay").off("mousemove");
		$("#canvas2DOverlay").off("mouseup");
		
		//	disable camera rotation when constructing 3D shape
		if (uiParams.selectedToolName == "_3DShape" || uiParams.selectedToolName == "surfaces") { 	
            return;
        }
		
		let onmousedown = function(e) {
			let light = cnvParams.scene.getObjectByName("light1");
			cameraParams.mdown.set(e.clientX - cnvParams.w - cnvParams.cnvOffsetX - 5, e.clientY - cnvParams.cnvOffsetY);
			cameraParams.thetam = cameraParams.theta;
			cameraParams.phim = cameraParams.phi;						
			let onmmove = function(e) {
				cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);
				
				cameraParams.mmove.set(e.clientX - cnvParams.w - cnvParams.cnvOffsetX - 5, e.clientY - cnvParams.cnvOffsetY);
			
				cameraParams.theta = -(cameraParams.mmove.x - cameraParams.mdown.x) * 0.2 + cameraParams.thetam;
				cameraParams.phi = (cameraParams.mmove.y - cameraParams.mdown.y) * 0.2 + cameraParams.phim;
				cameraParams.phi = Math.min( 90, Math.max( 0, cameraParams.phi ) );
				
				updateCamera();
				updateCoordSystemNumbers(cnvParams);
				
				shapes.forEach(function(shape) {
					if (shape.className != "Text2d") {
						shape.projectAndDrawLetters(); 
					}
				});
				
				//light && light.position.set(cnvParams.camera.position.x, cnvParams.camera.position.y, cnvParams.camera.position.z);		
				cnvParams.renderer.render(cnvParams.scene,  cnvParams.camera);
			}
			let onmup = function(e) {
				cnvParams.cnv3D.off("mousemove");
				cnvParams.cnv3D.off("mouseup");
				$("#canvas2DOverlay").off("mousemove");
				$("#canvas2DOverlay").off("mouseup");	
				Shape.prototype.camera = cnvParams.camera;
			}
			
			cnvParams.cnv3D.mousemove(onmmove);
			$("#canvas2DOverlay").mousemove(onmmove);					
			cnvParams.cnv3D.mouseup(onmup);
			$("#canvas2DOverlay").mouseup(onmup);
		}
		cnvParams.cnv3D.mousedown(onmousedown);
		$("#canvas2DOverlay").mousedown(onmousedown);
    }
	
	/**
	 * @function deleteSelectedShape - deletes selected shape and its 3d analog
	 */
	function deleteSelectedShape() {
		if (cnvParams.selectedShape) {
			let selID = cnvParams.selectedShape.getID();
			if (shapes.has(selID)) {
				cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);
				cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);
				
				let shapesGroup = cnvParams.selectedShape.connectedShapes;					
				shapesGroup.forEach(function(sh) {
					sh.detach(selID);
				});
				
				shapes.delete(selID);
				for (let entry of shapes) {
					entry[1].connectedShapes.clear();
					geometryEngine.createConnectedShapesGroup(entry[1]);
				}
						  
				if (shapes_3D.has(selID)) {
					shapes_3D.delete(selID);
				}
				
				let rObj = cnvParams.scene.getObjectByName(selID);
					cnvParams.scene.remove(rObj);
					cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
					renderShapes();
					cnvParams.selectedShape = 0;
					disableSelectedShapeAttribControls();
			}
		}
	}
	
	/**
	 * @function setUpGlobalEvents - sets up with handlers all other global events, like window resize,
	 * 3dviewcheckbox click, projectionSelect change, spectrum color and opacity change events
	 */
	function setUpGlobalEvents() {
		let factor = 2, cnv3DWidth;
		$(window).resize(function() {
			cnvParams.scene.remove(cnvParams.scene.getObjectByName("light1"));
			cnvParams.scene.remove(cnvParams.scene.getObjectByName("coordSystem"));
			cnvParams.scene.remove(cnvParams.scene.getObjectByName("xzPlane"));
			
			percent = 5; factor = 2;
			actualWindowWidth = getActualWinWidth();
			windowHeight = $(window).height();
			
			cnvParams.cnv.attr("width", actualWindowWidth - (actualWindowWidth*percent)/100 );
			cnvParams.cnv.attr("height", windowHeight - uiParams.topToolsContainerFullHeight - 10);
			cnvParams.w = cnvParams.cnv.width();
			cnvParams.h = cnvParams.cnv.height();
			cnvParams.bothCanvasesWidth = cnvParams.w;
			cnvParams.cnvOffsetX = (actualWindowWidth - cnvParams.w) / 2,
			cnvParams.cnvOffsetY = uiParams.topToolsContainerFullHeight;
			cnvParams.cnv.css({"left": cnvParams.cnvOffsetX, "top": cnvParams.cnvOffsetY});
			uiParams.topToolsContainer.css({"width": cnvParams.w, "margin-left": cnvParams.cnvOffsetX});
			
			if (cnvParams._3DviewEnabled) {
				cnvParams.cnv.attr("width", actualWindowWidth/factor - ((actualWindowWidth/factor)*percent)/100 );
				cnvParams.w = cnvParams.cnv.width();		
				cnv3DWidth = cnvParams.bothCanvasesWidth - cnvParams.w - 5;
				setUP3DView(cnv3DWidth);	
            }
			cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);
			cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);
			renderShapes();
		});
		uiParams._3dviewCheckBox.click(function(e) {
			cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);
			if (uiParams._3dviewCheckBox.is(':checked')) {
				uiParams._3DShapesTools.attr("style", "display: inline-block !important");
				uiParams.surfaceShapesTools.attr("style", "display: inline-block !important");
				uiParams.projectionSelect.removeAttr("disabled");
				cnvParams._3DviewEnabled = true;
				cnvParams.cnv.attr("width", actualWindowWidth/factor - ((actualWindowWidth/factor)*percent)/100 );
				cnvParams.w = cnvParams.cnv.width();		
				cnv3DWidth = cnvParams.bothCanvasesWidth - cnvParams.w - 5;				
				setUP3DView(cnv3DWidth);
				for (let i = cnvParams.scene.children.length-1; i >= 0; i--) {
                    let p3d = cnvParams.scene.children[i];					
					if ( p3d.name.indexOf("point") > -1) {
                        if (shapes.get(p3d.name).isOnBoundary) {
							cnvParams.scene.remove( p3d );
						}
					}				
                }
			} else {
				uiParams.projectionSelect.attr("disabled", true);
				uiParams._3DShapesTools.attr("style", "display: none !important");
				uiParams.surfaceShapesTools.attr("style", "display: none !important");
				cnvParams.scene.remove(cnvParams.scene.getObjectByName("light1"));
				cnvParams.scene.remove(cnvParams.scene.getObjectByName("coordSystem"));
				cnvParams.scene.remove(cnvParams.scene.getObjectByName("xzPlane"));
				cnvParams._3DviewEnabled = false;
				cnvParams.cnv.attr("width", actualWindowWidth - (actualWindowWidth*percent) / 100 );
				cnvParams.w = cnvParams.cnv.width();				
				cnvParams.renderer.setSize(0, 0);
				cnvParams.cnv2DOverlay.attr("width", 1);
				cnvParams.cnv2DOverlay.attr("height", 1);
				cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);
			}
			
			Shape.prototype._3DviewEnabled = cnvParams._3DviewEnabled;
			renderShapes();
		});
		
		uiParams.projectionSelect.change(function(e) {
			if ($(this).val() === "ortho") {
				cnvParams.camera = new THREE.OrthographicCamera(-cnv3DWidth, cnv3DWidth, cnvParams.h, -cnvParams.h, -2000, 2000);
				cnvParams.renderer.setSize(cnv3DWidth, cnvParams.h);
				cnvParams.camera.lookAt(new THREE.Vector3(0, 0, 0));
				cameraParams.distance = 1;
			
			} else if ($(this).val() === "persp") {
				cnvParams.camera = new THREE.PerspectiveCamera(cameraParams.fov, cnv3DWidth/cnvParams.h, 1, 3000);
				cnvParams.camera.position.z = 1880;
				cameraParams.distance = cnvParams.camera.position.length();
			}
			
			cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);
			updateCamera();
			updateCoordSystemNumbers(cnvParams);
			shapes.forEach(function(shape) {
				if (shape.className != "Text2d") {
					shape.projectAndDrawLetters(); 
				}
			});
			cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
		});
	
		//	spectrum events handling
		$("#selected-shape-colorpicker").spectrum({
			color: "#000",
			showButtons: false,
			move: function (color) {
				if (cnvParams.selectedShape) {
					cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);	
					cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);		
					cnvParams.selectedShape.setRenderAttribs({
						strokeStyle: color.toHexString(),
						fillColor: color.toHexString(),
						lineWidth: cnvParams.selectedShape.getBoundaryWidth()
					});
					updateCoordSystemNumbers(cnvParams);
					cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
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
					cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);
					if (cnvParams.selectedShape.className !== "Text2d") {
						$("#selected-shape-opacity-amount").val(ui.value);
						//log( (ui.value) )
						cnvParams.selectedShape.setOpacity(parseFloat(ui.value));    
					} else {
						//	...
					}
					updateCoordSystemNumbers(cnvParams);
					cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
					renderShapes();
				}			
			}
		});
		
		$("#selected-shape-opacity-amount").val($( "#selected-shape-opacity-slider" ).slider("value"));
		$("#selected-shape-opacity-slider").slider("disable");
		$("#selected-shape-delete-btn").click(deleteSelectedShape);
		$("body").keydown(function(e){
			let letter = String.fromCharCode(e.which);
			if (e.keyCode === 46) {
				deleteSelectedShape();
			}
		});
		
		$("#selected-shape-delete-btn").attr('disabled', 'disabled');
		enableToolHelpNotesOnHover();
	}
	
	
	/**
	 * @function enableToolHelpNotesOnHover - sets up explanation notes when hovering over the geometry tools from top tools panel
	 */
	function enableToolHelpNotesOnHover() {
		let leftOffset = parseFloat($("#top-tools-container").css("margin-left"));
		let topToolWidth = parseFloat($(".top-tool").outerWidth()) + $(".top-tool").length - 1;
		let topToolHeight = parseFloat($(".top-tool").outerHeight()) + 5;
		
		$(".active-subtool-help").each(function(i, el) {
			$(el).css({"left": leftOffset, "width": topToolWidth, "top": topToolHeight});
			leftOffset += topToolWidth;
			$(el).html( $(el).parent().parent().find(".tool-help").html() );
		});
		
		uiParams.topTools.mouseover(function(e) {
			$(".active-subtool-help").css({"display": "none"});
			if ( $(e.target).find(".sub-tools").css('visibility') === "hidden" || uiParams.selectedToolName == "move" ) {	//	if subtools div block is hidden show tool explanations

				if ($(e.target).attr("class").indexOf("top-tool") > -1) {
					$(e.target).find(".active-subtool-help").fadeIn();
				}
			}
		});
		
		uiParams.topTools.mouseout(function(e) {
			$(".active-subtool-help").css({"display": "none"});
		});
    }
	
	/**
	 * @function initShapes - initializes everything related to shapes
	 */
	function initShapes() {
		shapes 		  = new Map();
		shapes_3D	  = new Map();
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
		Shape.prototype.shapes_3D = shapes_3D;
		Shape.prototype.geometryEngine = new GeometryEngine();
	}
	
	/**
	 * @function initGeometryEngine - initializes everything related to geometry engine
	 */
	function initGeometryEngine() {
		GeometryEngine.prototype.cnvParams = cnvParams;
		GeometryEngine.prototype.shapes = shapes;
		geometryEngine = new GeometryEngine();
	}
	
	
	/**
	 * @function updateUI - updates selected state of the toolName
	 * @param {String} toolName - name of the tool (move, line, point, circle, polygon etc)
	 */
	function updateUI(toolName) {
		uiParams.topTools.removeClass("selected");
		uiParams.subTools.css({"visibility" : "hidden"});		
		$("." + toolName).addClass("selected");		
		$("." + toolName).find(".sub-tools").css({"visibility" : "visible"});
	}
	
	
	/**
	 * @function resetUIToDefaults - resets top tools selected state to default (deselects everything previously selected)
	 */
	function resetUIToDefaults() {
		uiParams.topTools.removeClass("selected");
		uiParams.subTools.css({"visibility": "hidden"});
	}
	
	/**
	 * @function disableSelectedShapeAttribControls - disables (make unclickable) selected shape attributes (fillColor, opacity, id and delete button) controls
	 */
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
	
	/**
	 * @function enableSelectedShapeAttribControls - enables (make clickable) selected shape attributes (fillColor, opacity, id and delete button) controls
	 */
	function enableSelectedShapeAttribControls() {
		$("#selected-shape").html(cnvParams.selectedShape.getID());
		$("#selected-shape-colorpicker").spectrum('enable');
		$("#selected-shape-colorpicker").spectrum("set", cnvParams.selectedShape.getFillColor());
		$("#selected-shape-opacity-amount").val( cnvParams.selectedShape.getOpacity() );
		$("#selected-shape-opacity-slider").slider('value', cnvParams.selectedShape.getOpacity());
		$("#selected-shape-opacity-slider").slider("enable");
		$("#selected-shape-delete-btn").removeAttr('disabled');	//	enable delete button
	}
	
	/**
	 * @function setUpTools - initializes click events for top tools and its sub tools, registering appropriate event handlers
	 */
	function setupTools() {
		$(".buttons, .top-tool, .sub-tools").disableSelection();
		uiParams.topTools.click(function(e) {
			offHandlers();
			e.stopPropagation();
			uiParams.selectedToolName = e.currentTarget.className.split(" ")[1];
			updateUI(uiParams.selectedToolName);
			disableSelectedShapeAttribControls();
			$(".active-subtool-help").css({"display": "none"});
			
			if (uiParams.selectedToolName !== "move") {				
				uiParams.activeSubToolName = $("." + uiParams.selectedToolName).find(".active-subtool")[0].className.split(" ")[1];
			} else {
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
				
				
				let helpText = $("." + uiParams.activeSubToolName).find(".tool-help").html();
				defTool.parent().find(".active-subtool-help").html(helpText); 
			});
			shapes.forEach(function(shape) {
				if (shape.className != "Text2d") {
					shape.projectAndDrawLetters(); 
				}
			});
		});
	}

	/**
	 * @function setupReload - registers click event on reload button click and clears canvas with 3d and 2d shapes,
	 * setting everything up to default values
	 */
	function setupReload() {
		uiParams.reloadBtn.click(function() {
			cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);
			cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);	
			resetUIToDefaults();
			disableSelectedShapeAttribControls();
			offHandlers();
			shapes.forEach(function(sh, id) {
				cnvParams.scene.remove(cnvParams.scene.getObjectByName(id));	
			});
			
			for (let i = cnvParams.scene.children.length - 1; i >= 0; i--){
				let obj = cnvParams.scene.children[i];
				if (obj.name !== "coordSystem" && obj.name !== "xzPlane" && obj.name !== "light1") {
					cnvParams.scene.remove(obj);
                }
			}
			
			updateCoordSystemNumbers(cnvParams);
			cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
			shapes.clear();
			shapes_3D.clear();
			Line.count = Ray.count = Segment.count = Vector.count = Polygon.count = 
			Triangle.count = RegularPolygon.count = Circle.count = Point.count = Text2d.count = 0;
			Shape.nextLetterIndex = 0;
			Shape.letterIndexMark = 0;
			$(".active-subtool-help").css({"display": "none"});
		});
	}
	
	/**
	 * @function emphasizeShapes - emphasizes shapes or points or shape's points when mouse moving
	 * @param {Object} e - event object of mousemove event
	 */
	function emphasizeShapes(e) {
		let mmove = new Vec2();
		cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);
		mmove.set(e.clientX - cnvParams.cnvOffsetX, e.clientY - cnvParams.cnvOffsetY);
		cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);		
		geometryEngine.emphasizeShapes(mmove);
		updateCoordSystemNumbers(cnvParams);
		renderShapes();
	}
	
	/**
	 * @function constructionLoop - when picking up any tool except 'move' from the top tools panel this function is being called
	 * enabling user to construct geometry primitivies primitives on the graphics view (2d or 3d canvas) by mouse events (like click then drag or enter a value)
	 * @param {Object} e - mouse click event parameter
	 * @param {String} toolName - the name of default top tool
	 * @param {String} subTool - the name of the selected subtool in a tool group
	 */
	function constructionLoop(e, toolName, subToolName) {
		let shape,
			shapeParts,
			mdown = new Vec2(),
			mmove = new Vec2(),
			cnv3DWidth = cnvParams.bothCanvasesWidth - cnvParams.w - 5,
			shapeConstructor = new shapeConstructorFactory(cnvParams, shapes, shapes_3D, cameraParams, updateCamera)
				.getConstructor(toolName, subToolName, mdown, mmove);		

		if (!shapeConstructor) {
			log("no such shape's constructor exists");
			return;
		}		
		
		cnvParams.cnv.mousedown(function(e) {
			if (toolName === "_3DShape" || toolName === "surfaces") return;
            
			$(".active-subtool-help").css({"display": "none"});
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
					cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);					
					geometryEngine.emphasizeShapesPoints(mmove);
					updateCoordSystemNumbers(cnvParams);
					
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
				shape.className !== "Point" && shape.points.forEach(function(p) {
					if (p.isOnBoundary) {
                        shape.translatable = false;
                    }
				});
				
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
				updateCamera();
				if (cnvParams._3DviewEnabled) {
					prepare3DShapes();
				}
				
				Shape.prototype.cnv2DOverlayContext.font = "15px Arial";
				cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
				renderShapes();
				return;
			}
			shapeConstructor.constructionNextStep();
		});
		
		//	3d shapes constructing
		if (cnvParams._3DviewEnabled) {
			setUP3DView(cnvParams.bothCanvasesWidth - cnvParams.w - 5);
		}
		
		cnvParams.cnv3D.mousedown(onCnv3DMdown);
		$("#canvas2DOverlay").mousedown(onCnv3DMdown);
		
		function onCnv3DMdown(e) {
			if (toolName !== "_3DShape" && toolName !== "surfaces") return;
			$(".active-subtool-help").css({"display": "none"});
			uiParams.subTools.css({"visibility" : "hidden"});
			e.stopPropagation();

			//	assuming that origin located at the screen center
			//	mdown.set(e.clientX - cnvParams.w - cnvParams.cnvOffsetX - cnv3DWidth * 0.5 - 5,	
			//			-(e.clientY - cnvParams.cnvOffsetY - cnvParams.h * 0.5));					
			
			mdown.set(e.clientX - cnvParams.w - cnvParams.cnvOffsetX - 5,
					 (e.clientY - cnvParams.cnvOffsetY));
			
			shapeConstructor.initConstruction();			
			
			if (!shapeConstructor.constructionReady()) {
				return false;
			}
			
			if (shapeConstructor.constructionStarted()) {
				cnvParams.cnv3D.mousemove(onCnv3DMmove);
				$("#canvas2DOverlay").mousemove(onCnv3DMmove);
			}
			
			if (shapeConstructor.constructionEnding()) {
				cnvParams.cnv3D.off("mousemove");
				$("#canvas2DOverlay").off("mousemove");				
				
				shape = shapeConstructor.endConstruction();
				if (!shape) {
					log("shape wasn't created");
					return;
				}
				
				updateCamera();				
				cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);		
				return;
			}
			
			shapeConstructor.constructionNextStep(); 
        }
		
		function onCnv3DMmove(e) {			
			mmove.set(e.clientX - cnvParams.w - cnvParams.cnvOffsetX - 5,
					 (e.clientY - cnvParams.cnvOffsetY));			

			shapeParts = shapeConstructor.processConstruction(e);
			cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);
			updateCoordSystemNumbers(cnvParams);
			cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
        }
	}
	
	
	/**
	 * @function transformLoop - when picking up 'move' tool this function is being called enabling user to trasform
	 * geometry primitive or group of the geometry primitives on the graphics view (2d or 3d canvas)
	 * by mouse events (select shape/group of the connected shapes/primitives by click then drag it to transform)
	 * @param {Object} e - mouse click event parameter
	 * @param {String} toolName - the name of default top tool
	 */
	function transformLoop(e, toolName) {
		let mdown = new Point(new Vec2(), 2),
			mmove = new Point(new Vec2(), 2),
			transformProps = {},
			useOldTransformProps = 0,
			connectedShapesGroup = 0,
			pointShape,
			selShape;
			
		if (cnvParams._3DviewEnabled) {
			setUP3DView(cnvParams.bothCanvasesWidth - cnvParams.w - 5);
		}
			
		cnvParams.cnv.mousedown(function(e) {
			$(".active-subtool-help").css({"display": "none"});
			
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
				if (cnvParams.selectedShape && cnvParams.selectedShape.opacity) {
					cnvParams.cnv.css({"cursor": "pointer"});    
				}
				cnvParams.cnv.mousemove(function(e) {
					mmove.set(e.clientX - cnvParams.cnvOffsetX, e.clientY - cnvParams.cnvOffsetY);
					cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);
					cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);
					updateCoordSystemNumbers(cnvParams);
					geometryEngine.transformShapes(transformProps, mdown, mmove);
					cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
					renderShapes();
				});
				cnvParams.cnv.mouseup(function() {
					cnvParams.cnv.css({"cursor": "auto"});
					cnvParams.cnv.off('mousemove');
					cnvParams.cnv.off('mouseup');
					cnvParams.cnv.mousemove(emphasizeShapes);
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
	
	/**
	 * @function offHandlers - removes all mouse events from 2d canvas 
	 */
	function offHandlers() {
		cnvParams.cnv.off("mousedown");
		cnvParams.cnv.off("mousemove");	
		cnvParams.cnv.off("mouseup");
		cnvParams.cnv.off("click");
		uiParams.subTool.off("click");
	}
	
	/**
	 * @function renderShapes - renders(draws) shapes to 2D canvas only
	 */
	function renderShapes() {
		shapes.forEach(function(shape, shapeID) {
			shape.render();
		});
	}
	
	/**
	 * @function setup everything needed for the application
	 */
	function setup() {
		setUpGlobalEvents();
		setupReload();
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