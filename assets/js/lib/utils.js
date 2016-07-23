"use strict";

// TODO:

;(function($, THREE, Global) {
	
	Map.prototype.getLastKey = function() {
		let keys = this.keys();
		for (var ret of this) {}
		return ret && ret[0];
	};
	
	Map.prototype.copy = function() {
		let ret = new Map();
		for (let entry of this) {
			ret.set(entry[0], entry[1]);
		}
		return ret;
	};
	
	function log(a, b) {
		if (!a && !b) {
			return;
		}
		if (a && !b) {
			console.log(a);
			return;
		}
		if (a && b) {
			console.log(a, b);
		}
	}
	
	function getPropsCountOf(object) {
		return Object.keys(object).length;
	}
	
	function clone(obj) {
		if (null == obj || "object" != typeof obj) return obj;
		let copy = obj.constructor();
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr)) {
				copy[attr] = obj[attr];
			}
		}
		return copy;
	}
	
	function getActualWinWidth() {
		var actualWidth = window.innerWidth ||
						document.documentElement.clientWidth ||
						document.body.clientWidth ||
						document.body.offsetWidth;
		return actualWidth;
	}
	
	//	get correct requestAnimationFrame
	(function() {
		var lastTime = 0;
		var vendors = ['ms', 'moz', 'webkit', 'o'];
		for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
			window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
			window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame']
																 || window[vendors[x]+'CancelRequestAnimationFrame'];
		}
	
		if (!window.requestAnimationFrame) {
			window.requestAnimationFrame = function(callback, element) {
				var currTime = new Date().getTime();
				var timeToCall = Math.max(0, 16 - (currTime - lastTime));
				var id = window.setTimeout(function() { callback(currTime + timeToCall); },
					timeToCall);
				lastTime = currTime + timeToCall;
				return id;
			};
		}
		if (!window.cancelAnimationFrame) {
			window.cancelAnimationFrame = function(id) {
					clearTimeout(id);
			}
		}
	}());
	
	Global.utils = Global.utils || {
		log : log,
		clone : clone,
		getPropsCountOf: getPropsCountOf,
		getActualWinWidth: getActualWinWidth
	};
	
})(jQuery, THREE, DSSGeometry);