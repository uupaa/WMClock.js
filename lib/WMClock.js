(function(global) {
"use strict";

// --- dependency modules ----------------------------------
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

var MODE_INTERVAL = 1; // setInterval mode
var MODE_TIMEOUT  = 2; // requestAnimationFrame emulation mode
var MODE_RAF      = 3; // requestAnimationFrame mode

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
    this._running   = false;                    // Boolean - running state.
    this._baseTime  = Date.now();               // Number - base time.
    this._lastTime  = 0.0;                      // Number - last call time.
    this._callCount = 0;                        // Integer - callback count.
    this._callbacks = [];                       // FunctionArray - [callback:Function, ...]
    this._tickMethod = _tick.bind(this);        // Function - _tick.bind(this)

    if (options["vsync"]) {
        this._mode = global["requestAnimationFrame"] ? MODE_RAF
                                                     : MODE_TIMEOUT;
    }
}

WMClock["prototype"] = {
    "constructor":  WMClock,           // new WMClock():WMClock
    // --- register / unregister callback functions ---
    "on":           WMClock_on,        // WMClock#on(callback:Function):void
    "off":          WMClock_off,       // WMClock#off(callback:Function):void
    "has":          WMClock_has,       // WMClock#has(callback):Boolean
    "once":         WMClock_once,      // WMClock#once(callback:Function, times:Integer = 1):this
    "clear":        WMClock_clear,     // WMClock#clear():void
    // --- master clock and state ---
    "run":          WMClock_run,       // WMClock#run():void
    "stop":         WMClock_stop,      // WMClock#stop():void
    "isRunning":    WMClock_isRunning  // WMClock#isRunning():Boolean
};

// --- implements ------------------------------------------
function WMClock_on(callback) { // @arg Function - callback(counter:Integer, now:Number, delta:Number):void
                                // @desc register callback.
//{@dev
    $valid($type(callback, "Function"), WMClock_on, "callback");
//}@dev

    if ( !this["has"](callback) ) { // ignore already registered function.
        this._callbacks.push(callback);
    }
}

function WMClock_off(callback) { // @arg Function - registered callback.
                                 // @desc deregister callback.
//{@dev
    $valid($type(callback, "Function"), WMClock_off, "callback");
//}@dev

    var pos = this._callbacks.indexOf(callback);

    if (pos >= 0) {
        this._callbacks[pos] = null;
    }
}

function WMClock_has(callback) { // @arg Function - callback
                                 // @ret Boolean - true is registered, false is unregistered.
                                 // @desc callback has registered?
//{@dev
    $valid($type(callback, "Function"), WMClock_has, "callback");
//}@dev

    return this._callbacks.indexOf(callback) >= 0;
}

function WMClock_once(callback, // @arg Function - callback(time:Number:Integer, delta:Number, count:Integer):void
                      times) {  // @arg Integer = 1
                                // @desc register the callback of one-time-only.
//{@dev
    $valid($type(callback, "Function"),                WMClock_once, "callback");
    $valid($type(times, "Integer|omit") || times <= 0, WMClock_once, "times");
//}@dev

    times = times || 1;
    var that = this;

    return that["on"](_handler);

    function _handler(time, delta, count) {
        callback(time, delta, count);
        if (--times <= 0) {
            that["off"](_handler);
        }
    }
}

function WMClock_clear() { // @desc Clear all callbacks.
    for (var i = 0, iz = this._callbacks.length; i < iz; ++i) {
        this._callbacks[i] = null;
    }
}

function WMClock_run() { // @desc Start the master clock.
    if (!this._running) {
        this._running  = true;
        this._lastTime = 0;

        switch (this._mode) {
        case MODE_INTERVAL: this._tid = setInterval(this._tickMethod, this._speed); break;
        case MODE_TIMEOUT:  this._tid = setTimeout(this._tickMethod, 4); break;
        case MODE_RAF:      this._tid = global["requestAnimationFrame"](this._tickMethod);
        }
    }
}

function WMClock_stop() { // @desc Stop the master clock.
    if (this._running) {
        switch (this._mode) {
        case MODE_INTERVAL: clearInterval(this._tid); break;
        case MODE_TIMEOUT:  clearTimeout(this._tid); break;
        case MODE_RAF:      global["cancelAnimationFrame"](this._tid);
        }
        this._running  = false;
        this._lastTime = 0;
        this._tid      = 0;
    }
}

function _tick(time) { // @arg DOMHighResTimeStamp|undefined
                       // @bind this
    if (!this._running) {
        return;
    }

    switch (this._mode) {
    case MODE_INTERVAL:
        time = Date.now() - this._baseTime;
        break;
    case MODE_TIMEOUT:
        time = Date.now() - this._baseTime;
        this._tid = setTimeout(this._tickMethod, 4);
        break;
    case MODE_RAF:
        this._tid = global["requestAnimationFrame"](this._tickMethod);
    }

    var needSweeps = 0;
    var i = 0, iz = this._callbacks.length;

    if (iz) {
        var callCount = this._callCount++;
        var deltaTime = time - this._lastTime;

        if (this._lastTime === 0) { // at first time?
            deltaTime = 0;
        }
        this._lastTime = time;

        for (; i < iz; ++i) {
            var callback = this._callbacks[i];
            if (callback) {
                callback(time, deltaTime, callCount);
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

function WMClock_isRunning() { // @ret Boolean - true is running, false is stopped
    return this._running;
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

