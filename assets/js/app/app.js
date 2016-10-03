"use strict";

// TODO:
//	1. Find intersection points of object and surface
//	2. Fix issue with designations projection on overlay2D cavnas

;(function($, THREE, Global) {
	
	let cnvParams,
		uiParams,
		cameraParams,
		updateCamera,
		shapes,
		shapes_3D,
		deletedShapes,
		percent,
		actualWindowWidth,
		windowHeight,
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
		
		cnvParams.historyIndex = 0;
		uiParams.topTools = $('.top-tool');
		uiParams.subTools = $('.sub-tools');
		uiParams.subTool = $('.sub-tool');
		uiParams.topToolsContainer = $("#top-tools-container");
		uiParams.topToolsContainerFullHeight = parseInt(uiParams.topToolsContainer.height()) +
				parseInt(uiParams.topToolsContainer.css("margin-top")) 	+ parseInt(uiParams.topToolsContainer.css("margin-bottom"))
			  + parseInt(uiParams.topToolsContainer.css("padding-top")) + parseInt(uiParams.topToolsContainer.css("padding-bottom"));
			  
		uiParams.reloadBtn = $(".reloadBtn");
		//uiParams.undoBtn = $(".undoBtn");
		//uiParams.redoBtn = $(".redoBtn");
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
			phi:   	   25,	//	25
			theta:	   -15,	//	-15
			phim:	   0,
			thetam:	   0,
			fov:	   55
		};
	}
	
	function setUp3D() {
		$(uiParams._3dviewCheckBox).attr("checked", false);
		$("#render-canvases").append(cnvParams.renderer.domElement);
		cnvParams.camera = new THREE.OrthographicCamera(-cnvParams.w, cnvParams.w, cnvParams.h, -cnvParams.h, -2000, 2000);
		cnvParams.renderer.setSize(0, 0);
		//cnvParams.renderer.sortObjects = false
		//cnvParams.renderer.context.disable(cnvParams.renderer.context.DEPTH_TEST);
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
	
	function prepare3DShapes() {
		shapes.forEach(function(shape, shapeID) {
			if (!shapes_3D.has(shapeID) && shape.className !== "Text2d") {
				let shape_3D = shape.createMeshFromThis();
				shapes_3D.set(shapeID, shape_3D);
			}
		});
	}
	
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
		
		let coordSystem = createCoordinateSystem(cnv3DWidth, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0x444678, 0x444678, 0x444678));
		coordSystem.name = "coordSystem";
		
		cameraParams.light1 = new THREE.DirectionalLight(0xffffff, 0.3);
		cameraParams.light1.name = "light1";
		cameraParams.light1.position.set(500, 500, 100);
		
		if (cnvParams.scene.getObjectByName("light1") === undefined) {
			cnvParams.scene.add(cameraParams.light1);    
        }
		
		//cameraParams.light2 = new THREE.DirectionalLight(0xffffff, 0.8);
		//cameraParams.light2.name = "light2";
		//cameraParams.light2.position.set(-500, 500, -700);			
		//cnvParams.scene.add(cameraParams.light2);

		if (cnvParams.scene.getObjectByName("coordSystem") === undefined) {
			cnvParams.scene.add(coordSystem);   
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
		

		cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);			//	initial rendering
    }
	
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
				cameraParams.mmove.set(e.clientX - cnvParams.w - cnvParams.cnvOffsetX - 5, e.clientY - cnvParams.cnvOffsetY);
			
				cameraParams.theta = -(cameraParams.mmove.x - cameraParams.mdown.x) * 0.2 + cameraParams.thetam;
				cameraParams.phi = (cameraParams.mmove.y - cameraParams.mdown.y) * 0.2 + cameraParams.phim;
				cameraParams.phi = Math.min( 90, Math.max( 0, cameraParams.phi ) );
				
				updateCamera();
				
				cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);
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
			
			updateCamera();
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
						cnvParams.selectedShape.setOpacity(parseFloat(ui.value));    
					} else {
						//	...
					}
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
	
	function initShapes() {
		shapes 		  = new Map();
		shapes_3D	  = new Map();
		deletedShapes = new Map();
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
		});
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
			
			for (let i = cnvParams.scene.children.length - 1; i >= 0; i--){
				let obj = cnvParams.scene.children[i];
				if (obj.name !== "coordSystem" && obj.name !== "xzPlane" && obj.name !== "light1") {
					cnvParams.scene.remove(obj);
                }
			}
			
			cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
			shapes.clear();
			shapes_3D.clear();
			deletedShapes.clear();
			Line.count = Ray.count = Segment.count = Vector.count = Polygon.count = 
			Triangle.count = RegularPolygon.count = Circle.count = Point.count = Text2d.count = 0;
			Shape.nextLetterIndex = 0;
			Shape.letterIndexMark = 0;
			$(".active-subtool-help").css({"display": "none"});
		});
	}
	
	function emphasizeShapes(e) {
		let mmove = new Vec2();
		cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);
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
				updateCamera();
				if (cnvParams._3DviewEnabled) {
					prepare3DShapes();
				}
				
				Shape.prototype.cnv2DOverlayContext.font = "15px Arial";
				cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
				//log(cnvParams.scene.children)
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
			cnvParams.renderer.render(cnvParams.scene, cnvParams.camera);
        }
	}
	
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
				cnvParams.cnv.css({"cursor": "pointer"});
				cnvParams.cnv.mousemove(function(e) {
					mmove.set(e.clientX - cnvParams.cnvOffsetX, e.clientY - cnvParams.cnvOffsetY);
					cnvParams.ctx.clearRect(0, 0, cnvParams.w, cnvParams.h);
					cnvParams.cnv2DOverlayContext.clearRect(0, 0, cnvParams.w, cnvParams.h);
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