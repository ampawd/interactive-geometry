"use strict";

// TODO:

;(function($, THREE, Global) {
	
	/**
	 * @function log - basic shorthand for console.log
	 * @param {Object} a - first loging argument
	 * @param {Object} b  second loging argument
	 */
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

	/**
	 * @function clone - deeply clones object
	 * @returns {Object} cloned one
	 */
	function clone(obj) {
	   if (null == obj || "object" != typeof obj)
	      return obj;
		
	   let copy = obj.constructor();
	   for (var attr in obj) {
	     if (obj.hasOwnProperty(attr))
		   copy[attr] = obj[attr];
	   }
	   return copy;
	}

	/**
	 * @function getPropsCountOf - returns count of the object properties
	 * @param {Object} object - object to count number of properties for
	 * @returns {Number} number of properties
	 */
	function getPropsCountOf(object) {
	   return Object.keys(object).length;
	}

	/**
	 * @function getActualWinWidth - returns window width in a cross browser manner
	 */
	function getActualWinWidth() {
	   return window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || document.body.offsetWidth;
	}

	/**
	 * @function anonymus - sets up correct requestAnimationFrame for all browsers
	 */
	(function() {
	   var lastTime = 0;
	   var vendors = ['ms', 'moz', 'webkit', 'o'];
	   for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
	      window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
	      window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
	   }
		
	   if (!window.requestAnimationFrame) {
	      window.requestAnimationFrame = function(callback, element) {
		     var currTime = new Date().getTime();
		     var timeToCall = Math.max(0, 16 - (currTime - lastTime));
		     var id = window.setTimeout(function() { callback(currTime + timeToCall); }, timeToCall);
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
	   clone: clone,
	   getPropsCountOf: getPropsCountOf,
	   getActualWinWidth: getActualWinWidth
	};
	
})(jQuery, THREE, DSSGeometry);