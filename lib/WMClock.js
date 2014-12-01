(function(global) {
"use strict";

// --- dependency modules ----------------------------------
var WMBaseTime = global["WMBaseTime"];

// --- define / local variables ----------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;

/*
| API                   | iOS | ASOP | Chrome | IE  |
|-----------------------|-----|------|--------|-----|
| requestAnimationFrame |  7+ | 4.4+ | YES    | 10+ |
| performance.now()     |  8+ | 4.4+ | YES    | 10+ |
 */

/*
var clock = new WMClock({ vsync: true });
clock.on(tick);

function tick(time,    // @arg Number
              delta) { // @arg Number
    update();
}
 */

var MODE_INTERVAL = 1; // use setInterval
var MODE_TIMEOUT  = 2; // use setTimeout(requestAnimationFrame emulation mode)
var MODE_RAF      = 3; // use requestAnimationFrame
var requestAnimationFrame = "requestAnimationFrame";

// --- class / interfaces ----------------------------------
function WMClock(options) { // @arg Object = {} - { vsync, speed }
                            // @options.vsync - Boolean - true is use requestAnimationFrame, false is use setInterval.
                            // @options.speed - Number = 16 - setInterval(, speed)
                            // @desc Master Clock.
//{@dev
    $valid($type(options, "Object|omit"), WMClock, "options");
    $valid($keys(options, "vsync|speed"), WMClock, "options");
    if (options) {
        $valid($type(options.vsync, "Boolean|omit"), WMClock, "options.vsync");
        $valid($type(options.speed, "Number|omit"),  WMClock, "options.speed");
    }
//}@dev

    options = options || {};

    this._mode      = MODE_INTERVAL;            // Integer - mode. MODE_XXX
    this._speed     = options["speed"] || 16;   // Integer: setInterval(, speed)
    this._tid       = 0;                        // Integer - timer id(requestAnimationFrame id).
    this._active    = false;                    // Boolean - active state.
    this._baseTime  = WMBaseTime.now();         // Number - base time.
    this._lastTime  = 0.0;                      // Number - last call time.
    this._callbacks = [];                       // FunctionArray - [callback:Function, ...]
    this._tickMethod = _tick.bind(this);        // Function - _tick.bind(this)

    if (options["vsync"]) {
        this._mode = global[requestAnimationFrame] ? MODE_RAF : MODE_TIMEOUT;
    }
}

WMClock["prototype"] = {
    "constructor":  WMClock,           // new WMClock():WMClock
    // --- change clock state ---
    "start":        WMClock_start,     // WMClock#start():this
    "pause":        WMClock_pause,     // WMClock#pause():this
    "stop":         WMClock_stop,      // WMClock#stop():this
    "isActive":     WMClock_isActive,  // WMClock#isActive():Boolean
    "run":          WMClock_start,     // [DEPRECATED] WMClock#run():this
    "isRunning":    WMClock_isActive,  // [DEPRECATED] WMClock#isActive():Boolean
    // --- register / unregister callback functions ---
    "on":           WMClock_on,        // WMClock#on(callback:Function):this
    "off":          WMClock_off,       // WMClock#off(callback:Function):this
    "has":          WMClock_has,       // WMClock#has(callback):Boolean
    "nth":          WMClock_nth,       // WMClock#nth(times:Integer, callback:Function):this
    "clear":        WMClock_clear      // WMClock#clear():this
};

// --- implements ------------------------------------------
function WMClock_start() { // @ret this
                           // @desc start the master clock.
    if (!this._active) {
        this._active   = true;
        this._lastTime = 0;

        switch (this._mode) {
        case MODE_INTERVAL: this._tid = setInterval(this._tickMethod, this._speed); break;
        case MODE_TIMEOUT:  this._tid = setTimeout(this._tickMethod, 4); break;
        case MODE_RAF:      this._tid = global[requestAnimationFrame](this._tickMethod);
        }
    }
    return this;
}

function WMClock_pause() { // @desc toggle start/stop state
    if (this._active) {
        this["stop"]();
    } else {
        this["start"]();
    }
    return this;
}

function WMClock_stop() { // @ret this
                          // @desc stop the master clock.
    if (this._active) {
        switch (this._mode) {
        case MODE_INTERVAL: clearInterval(this._tid); break;
        case MODE_TIMEOUT:  clearTimeout(this._tid); break;
        case MODE_RAF:      global["cancelAnimationFrame"](this._tid);
        }
        this._active   = false;
        this._lastTime = 0;
        this._tid      = 0;
    }
    return this;
}

function _tick(time) { // @arg DOMHighResTimeStamp|undefined
                       // @bind this
    if (!this._active) {
        return;
    }

    switch (this._mode) {
    case MODE_INTERVAL:
        time = WMBaseTime.now() - this._baseTime;
        break;
    case MODE_TIMEOUT:
        time = WMBaseTime.now() - this._baseTime;
        this._tid = setTimeout(this._tickMethod, 4);
        break;
    case MODE_RAF:
        this._tid = global[requestAnimationFrame](this._tickMethod);
    }

    var needSweeps = 0;
    var i = 0, iz = this._callbacks.length;

    if (iz) {
        var deltaTime = time - this._lastTime;

        if (this._lastTime === 0) { // at first time?
            deltaTime = 0;
        }
        this._lastTime = time;

        for (; i < iz; ++i) {
            var callback = this._callbacks[i];
            if (callback) {
                callback(time, deltaTime); // callback(time:Number, delta:Number):void
            } else {
                ++needSweeps;
            }
        }
    }
    // sweep
    if (iz > 10 && needSweeps) {
        var denseArray = [];
        for (i = 0; i < iz; ++i) {
            if (this._callbacks[i]) {
                denseArray.push(this._callbacks[i]);
            }
        }
        this._callbacks = denseArray;
    }
}

function WMClock_isActive() { // @ret Boolean
    return this._active;
}

function WMClock_on(callback) { // @arg Function - callback(time:Number, delta:Number):void
                                // @ret this
                                // @desc register callback.
//{@dev
    $valid($type(callback, "Function"), WMClock_on, "callback");
//}@dev

    if ( !this["has"](callback) ) { // ignore already registered function.
        this._callbacks.push(callback);
    }
    return this;
}

function WMClock_off(callback) { // @arg Function - registered callback.
                                 // @ret this
                                 // @desc deregister callback.
//{@dev
    $valid($type(callback, "Function"), WMClock_off, "callback");
//}@dev

    var pos = this._callbacks.indexOf(callback);

    if (pos >= 0) {
        this._callbacks[pos] = null;
    }
    return this;
}

function WMClock_has(callback) { // @arg Function - callback
                                 // @ret Boolean - true is registered, false is unregistered.
                                 // @desc callback has registered?
//{@dev
    $valid($type(callback, "Function"), WMClock_has, "callback");
//}@dev

    return this._callbacks.indexOf(callback) >= 0;
}

function WMClock_nth(times,      // @arg Integer - value from 1.
                     callback) { // @arg Function - callback(time:Number, delta:Number):void
                                 // @ret this
                                 // @desc register the callback of number of times.
//{@dev
    $valid($type(times, "Integer"),     WMClock_nth, "times");
    $valid($type(callback, "Function"), WMClock_nth, "callback");
//}@dev

    var that = this;
    var count = 1;

    return that["on"](_handler);

    function _handler(time, delta) {
        if (count >= times) {
            that["off"](_handler);
        }
        callback(time, delta, count++);
    }
}

function WMClock_clear() { // @ret this
                           // @desc clear all callbacks.
    for (var i = 0, iz = this._callbacks.length; i < iz; ++i) {
        this._callbacks[i] = null;
    }
    return this;
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
if ("process" in global) {
    module["exports"] = WMClock;
}
global["WMClock" in global ? "WMClock_" : "WMClock"] = WMClock; // switch module. http://git.io/Minify

})((this || 0).self || global); // WebModule idiom. http://git.io/WebModule

