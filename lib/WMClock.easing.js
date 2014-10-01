(function(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;

// --- class / interfaces ----------------------------------
// --- implements ------------------------------------------
function WMClock_easing(callback, // @arg Function - callback(time:Number:Integer, delta:Number, count:Integer, data:Array):void
                        param) {  // @arg ObjectArray - [{ easing, startValue, endValue, startTime, endTime }, ...]
                                  // @desc register the callback of one-time-only.
//{@dev
    $valid($type(callback, "Function"), WMClock_easing, "callback");
    $valid($type(param,    "Array"),    WMClock_easing, "param");
    param.forEach(function(item) {
        $valid($keys(item, "easing|startValue|endValue|startTime|endTime"), WMClock_easing, "param");
        $valid($type(item.easing,     "String"),  WMClock_easing, "easing");
        $valid($type(item.startValue, "Number"),  WMClock_easing, "startValue");
        $valid($type(item.endValue,   "Number"),  WMClock_easing, "endValue");
        $valid($type(item.startTime,  "Integer"), WMClock_easing, "startTime");
        $valid($type(item.endTime,    "Integer"), WMClock_easing, "endTime");
    });
//}@dev

    var that = this;
    var masterStartTime = param.reduce(function(result, curt) {
                                return Math.min(result, curt.startTime);
                            }, param[0].startTime);
    var masterEndTime   = param.reduce(function(result, curt) {
                                return Math.max(result, curt.endTime);
                            }, 0);

    return that["on"](_handler);

    function _handler(time, delta, count) {







        callback(time, delta, count);
        if (--times <= 0) {
            that["off"](_handler);
        }
    }
}

// --- validate / assertions -------------------------------
//{@dev
function $valid(val, fn, hint) { if (global["Valid"]) { global["Valid"](val, fn, hint); } }
function $type(obj, type) { return global["Valid"] ? global["Valid"].type(obj, type) : true; }
function $keys(obj, str) { return global["Valid"] ? global["Valid"].keys(obj, str) : true; }
//function $some(val, str, ignore) { return global["Valid"] ? global["Valid"].some(val, str, ignore) : true; }
//function $args(fn, args) { if (global["Valid"]) { global["Valid"].args(fn, args); } }
//}@dev

// --- exports ---------------------------------------------
global["WMClock_" in global ? "WMClock_"
                            : "WMClock"]["easing"] = WMClock_easing; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

