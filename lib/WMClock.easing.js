(function(global) {
"use strict";

// --- dependency modules ----------------------------------
// --- define / local variables ----------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;

var EZFN = 0;
var V1   = 1; // value 1
var V2   = 2; // value 2
var T1   = 3; // time 1
var T2   = 4; // time 2

// --- class / interfaces ----------------------------------
// --- implements ------------------------------------------
/*
var ACTION_1 = {
        //id    [ezfn,     v1,  v2,   t1,   t2
        "p1_x": ["linear", 0,   400,  100, 550],
        "p1_y": ["inquad", 0,   400,  100, 550],
        "p1_a": ["inquad", 0.8, 0.2,  250, 600]
    };

var particle = {
      "p1": _createParticleNode("p1", 0, 0, 100, 100, "rgba(0,0,0,1)")
    };

new WMClock({ vsync: true }).easing(ACTION_1, function(time, delta, count, data) {
    for (var id in data) { // id is "p1_x" | "p1_y" | "p1_a"
        var ary = id.split("_");
        var nid  = ary[0];
        var prop = ary[1];

        switch (prop) {
        case "x": particle[nid].style.left = data[id] + "px"; break;
        case "y": particle[nid].style.top  = data[id] + "px"; break;
        case "a": particle[nid].style.backgroundColor = "rgba(0,0,0," + data[id] + ")";
        }
    }
}, { tax: 5 }).run();

--- timeline ---
0                         50                           100
|                          |                            |
|--------------------------|----------------------------|
|   10                       55                         |
|  x |------------------------|                         |
|           25                             80           |
|          y |------------------------------|           |
|           25                  60                      |
|          a |-------------------|                      |

 */


function WMClock_easing(data,      // @arg Object - easing data. { id: [ezfn:Function, v1:Number, v2:Number, t1:Number, t2:Number], ... }
                        callback,  // @arg Function - callback(time:Number:Integer, delta:Number, count:Integer,
                                   //                          values:Object, setup:Boolean, tearDown:Boolean):void
                        options) { // @arg Object = {} - { tax: Number = 1 }
                                   // @ret this
//{@dev
    $valid($type(data,     "Object"),      WMClock_easing, "data");
    $valid($type(callback, "Function"),    WMClock_easing, "callback");
    $valid($type(options,  "Object|omit"), WMClock_easing, "options");
    $valid($keys(options,  "tax"),        WMClock_easing, "options");
    if (options) {
        $valid($type(options.tax, "Number|omit"), WMClock_easing, "options.tax");
    }
    for (var id in data) {
        $valid($type(data[id][EZFN], "String"), WMClock_easing, "ezfn");
        $valid($type(data[id][V1],   "Number"), WMClock_easing, "v1");
        $valid($type(data[id][V2],   "Number"), WMClock_easing, "v2");
        $valid($type(data[id][T1],   "Number"), WMClock_easing, "t1");
        $valid($type(data[id][T2],   "Number"), WMClock_easing, "t2");
        $valid(data[id][EZFN] in Easing,        WMClock_easing, "ezfn");
        $valid(data[id][T1] >= 0,               WMClock_easing, "t1");
        $valid(data[id][T2] >= 0,               WMClock_easing, "t2");
        $valid(data[id][T1] <= data[id][T2],    WMClock_easing, "t2");
    }
//}@dev

    options = options || {};

    var that = this;

    var baseTime = 0;
    var localCount = 0;
    var ids = Object.keys(data);
    var tax = options["tax"] || 1;

    return that["on"](_handler);

    function _handler(time, delta, count) {
        var values = {};
        var currentTime = 0;
        var setup = localCount++ === 0;

        if (setup) {
            baseTime = time; // 初回は、現在の相対時刻(time)をbaseTimeとして保存する
        } else {
            currentTime = time - baseTime; // 経過時間を算出
        }
        var finishedCount = 0;

        for (var i = 0, iz = ids.length; i < iz; ++i) {
            var id   = ids[i];
            var item = data[id];
            var ezfn = item[EZFN];
            var t1   = item[T1] * tax;
            var t2   = item[T2] * tax;
            var v1   = item[V1];
            var v2   = item[V2];

            if (currentTime <= t1) { // waiting
                values[id] = v1;
            } else if (currentTime >= t2) { // finished
                values[id] = v2;
                ++finishedCount;
            } else {
                values[id] = Easing[ezfn](currentTime, v1, v2 - v1, t2);
            }
        }

        var tearDown = finishedCount === iz;

        if (tearDown) { // all task finished
            that["off"](_handler);
        }
        callback(time, delta, count, values);
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
                            : "WMClock"]["prototype"]["easing"] = WMClock_easing; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

