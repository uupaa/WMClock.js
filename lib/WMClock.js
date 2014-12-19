(function(global) {
"use strict";

// --- dependency modules ----------------------------------
//var PageVisibilityEvent = global["PageVisibilityEvent"];

// --- define / local variables ----------------------------
//var _runOnNode = "process" in global;
//var _runOnWorker = "WorkerLocation" in global;
//var _runOnBrowser = "document" in global;

/*
| API                   | iOS | AOSP | Chrome | IE  |
|-----------------------|-----|------|--------|-----|
| requestAnimationFrame |  7+ | 4.4+ | YES    | 10+ |
| performance.now()     |  8+ | 4.4+ | YES    | 10+ |
 */

/*
var clock = new WMClock([tick], { start: true, vsync: true });

function tick(timeStamp, // @arg Number
              deltaTime, // @arg Number
              count) {   // @arg Integer - callback count
    update();
}
 */

var MODE_INTERVAL    = 1; // use setInterval
var MODE_RAF_EMULATE = 2; // use setTimeout(requestAnimationFrame emulation mode)
var MODE_RAF         = 3; // use requestAnimationFrame
var RAF = "requestAnimationFrame";

// --- class / interfaces ----------------------------------
function WMClock(ticks,     // @arg TickFunctionArray = [] - [tick, ...]
                 options) { // @arg Object = {} - { start, vsync, speed, pulse, suspend, baseTime }
                            // @options.start Boolean = false - auto start.
                            // @options.vsync Boolean = false - use requestAnimationFrame(false is use setInterval).
                            // @options.speed Number = 16.666 - setInterval(, speed)
                            // @options.pulse Number = 0.0 - overwrite delta time(unit: ms)(range of oscillation time).
                            // @options.suspend Boolean = false - automatically suspend by page visibility event.
                            // @options.baseTime Number = 0.0 - setBaseTime value
                            // @desc Master Clock.
//{@dev
    $valid($type(ticks,   "TickFunctionArray|omit"), WMClock, "ticks");
    $valid($type(options, "Object|omit"), WMClock, "options");
    $valid($keys(options, "start|vsync|speed|pulse|suspend|baseTime"), WMClock, "options");
    if (options) {
        $valid($type(options.start, "Boolean|omit"), WMClock, "options.start");
        $valid($type(options.vsync, "Boolean|omit"), WMClock, "options.vsync");
        $valid($type(options.speed, "Number|omit"),  WMClock, "options.speed");
        $valid($type(options.pulse, "Number|omit"),  WMClock, "options.pulse");
        $valid($type(options.suspend, "Boolean|omit"), WMClock, "options.suspend");
        $valid($type(options.baseTime, "Number|omit"), WMClock, "options.baseTime");
    }
//}@dev

    options = options || {};

    var that = this;

    this._mode    = MODE_INTERVAL;              // Integer - mode. MODE_XXX
    this._ticks   = [];                         // TickFunctionArray - callback functions. [tick, ...]
    this._speed   = options["speed"] || 16.666; // Number - setInterval(, speed)
    this._pulse   = options["pulse"] || 0.0;    // Number - overwrite delta time(range of oscillation time).
    this._active  = false;                      // Boolean - active state.
    this._timerID = 0;                          // Integer - timer id.
    this._counter = 0;                          // Integer - callback counter.
    this._timeStamp = -1;                       // Number - last time stamp.
    this._baseTime  = 0.0;
    this._baseTimeDiff = 0.0;                   // difference time
    this._enterFrame = _enterFrame.bind(this);  // Function - _enterFrame.bind(this)

    (ticks || []).forEach(WMClock_on, this);

    if (options["vsync"]) {
        this._mode = global[RAF] ? MODE_RAF : MODE_RAF_EMULATE;
    }
    if (options["suspend"]) { // auto suspend
        if (global["PageVisibilityEvent"]) {
            global["PageVisibilityEvent"]["on"](_onsuspend);
        }
    }
    if (options["start"]) { // auto start
        this["start"]();
    }
    this["setBaseTime"](options["baseTime"] || 0.0);

    function _onsuspend(pageHide) {
        if (pageHide) {
            that["stop"]();
        } else {
            that["start"]();
        }
    }
}

WMClock["prototype"] = {
    "constructor":  WMClock,            // new WMClock():WMClock
    // --- change clock state ---
    "start":        WMClock_start,      // WMClock#start():this
    "pause":        WMClock_pause,      // WMClock#pause():this
    "stop":         WMClock_stop,       // WMClock#stop():this
    "isActive":     WMClock_isActive,   // WMClock#isActive():Boolean
    // --- register / unregister callback functions ---
    "on":           WMClock_on,         // WMClock#on(tick:Function):this
    "off":          WMClock_off,        // WMClock#off(tick:Function):this
    "has":          WMClock_has,        // WMClock#has(tick:Function):Boolean
    "nth":          WMClock_nth,        // WMClock#nth(tick:Function, times:Integer = 1):this
    "clear":        WMClock_clear,      // WMClock#clear():this
    // --- counter reset ---
    "resetCount":   WMClock_resetCount, // WMClock#resetCount():this
    // --- baseTime ---
    "getBaseTime":  WMClock_getBaseTime,// WMClock.getBaseTime():Number
    "setBaseTime":  WMClock_setBaseTime,// WMClock.setBaseTime(baseTime:Number):void
    "now":          WMClock_now,        // WMClock.now():Number
};

// --- implements ------------------------------------------
function _enterFrame(timeStamp) { // @arg DOMHighResTimeStamp|undefined - requestAnimationFrame give us timeStamp.
                                  // @bind this
    if (!this._active) {
        return;
    }
    switch (this._mode) {
    case MODE_RAF_EMULATE: this._timerID = setTimeout(this._enterFrame, 4); break;
    case MODE_RAF:         this._timerID = global[RAF](this._enterFrame);
    }
    if (!this._ticks.length) {
        return;
    }
    // setInterval and setTimeout does not give us the timeStamp.
    if (this._mode === MODE_INTERVAL ||
        this._mode === MODE_RAF_EMULATE) {
        timeStamp = this["now"]();
    }

    var garbageFunctions = 0; // functions that are no longer needed.
    var deltaTime = 0;        // elapsed time since the last frame.
    var count = this._counter++;

    // --- adjust timeStamp and deltaTime ---
    if (this._timeStamp < 0) { // init
        if (this._pulse) { // overwrite timeStamp
            timeStamp = this._pulse;
        }
    } else {
        if (this._pulse) { // overwrite timeStamp
            timeStamp = this._pulse + this._timeStamp;
            deltaTime = this._pulse;
        } else {
            deltaTime = timeStamp - this._timeStamp;
        }
    }
    this._timeStamp = timeStamp; // update time stamp

    // --- callback tick function ---
    for (var i = 0, iz = this._ticks.length; i < iz; ++i) {
        var tick = this._ticks[i];

        if (tick) {
            tick(timeStamp,  // @arg Number - current time
                 deltaTime,  // @arg Number - delta time
                 count);     // @arg Integer - callback count
        } else {
            ++garbageFunctions;
        }
    }
    if (garbageFunctions) {
        _garbageCollection(this);
    }
}
function _garbageCollection(that) {
    var denseArray = [];
    for (var i = 0, iz = that._ticks.length; i < iz; ++i) {
        if (that._ticks[i]) {
            denseArray.push(that._ticks[i]);
        }
    }
    that._ticks = denseArray;
}

function WMClock_start() { // @ret this
                           // @desc start the master clock.
    if (!this._active) {
        this._active = true;
        this._timeStamp = -1; // clear

        switch (this._mode) {
        case MODE_INTERVAL:    this._timerID = setInterval(this._enterFrame, this._speed); break;
        case MODE_RAF_EMULATE: this._timerID = setTimeout(this._enterFrame, 4); break;
        case MODE_RAF:         this._timerID = global[RAF](this._enterFrame);
        }
    }
    return this;
}

function WMClock_stop() { // @ret this
                          // @desc stop the master clock.
    if (this._active) {
        this._active = false;
        this._timeStamp = -1; // clear

        switch (this._mode) {
        case MODE_INTERVAL:    clearInterval(this._timerID); break;
        case MODE_RAF_EMULATE: clearTimeout(this._timerID); break;
        case MODE_RAF:         global["cancelAnimationFrame"](this._timerID);
        }
        this._timerID = 0;
    }
    return this;
}

function WMClock_pause() { // @ret this
                           // @desc toggle start/stop state
    if (this._active) {
        this["stop"]();
    } else {
        this["start"]();
    }
    return this;
}

function WMClock_isActive() { // @ret Boolean
    return this._active;
}

function WMClock_on(tick) { // @arg Function - tick(timeStamp:Number, deltaTime:Number, count:Integer):void
                            // @ret this
                            // @desc register callback.
//{@dev
    $valid($type(tick, "Function"), WMClock_on, "tick");
//}@dev

    if ( !this["has"](tick) ) { // ignore already registered function.
        this._ticks.push(tick);
    }
    return this;
}

function WMClock_off(tick) { // @arg Function - registered tick function.
                             // @ret this
                             // @desc deregister callback.
//{@dev
    $valid($type(tick, "Function"), WMClock_off, "tick");
//}@dev

    var pos = this._ticks.indexOf(tick);

    if (pos >= 0) {
        this._ticks[pos] = null;
    }
    return this;
}

function WMClock_has(tick) { // @arg Function - tick function
                             // @ret Boolean - true is registered, false is unregistered.
//{@dev
    $valid($type(tick, "Function"), WMClock_has, "tick");
//}@dev

    return this._ticks.indexOf(tick) >= 0;
}

function WMClock_nth(tick,    // @arg Function - tick(timeStamp:Number, deltaTime:Number, count:Integer):void
                     times) { // @arg Integer = 1 - value from 1.
                              // @ret this
                              // @desc register the tick function of number of times.
//{@dev
    $valid($type(tick,  "Function"),     WMClock_nth, "tick");
    $valid($type(times, "Integer|omit"), WMClock_nth, "times");
    if (times !== undefined) {
        $valid(times > 0,                WMClock_nth, "times");
    }
//}@dev

    times = times || 1;

    var that = this;
    var counter = 0;

    if (this["has"](tick)) {
        throw new TypeError("tick function already exists");
    }
    return that["on"](_handler);

    function _handler(timeStamp, deltaTime) {
        if (counter + 1 >= times) {
            that["off"](_handler);
        }
        tick(timeStamp, deltaTime, counter++);
    }
}

function WMClock_clear() { // @ret this
                           // @desc clear all ticks.
    for (var i = 0, iz = this._ticks.length; i < iz; ++i) {
        this._ticks[i] = null;
    }
    return this;
}

function WMClock_resetCount() { // @ret this
    this._counter = 0;
}

function WMClock_getBaseTime() { // @ret Number - base time
    return this._baseTime;
}

function WMClock_setBaseTime(baseTime) { // @arg Number - base time
//{@dev
    $valid($type(baseTime, "Number"), WMClock_setBaseTime, "baseTime");
//}@dev
    this._baseTime = baseTime;
    this._baseTimeDiff = Date.now() - baseTime;
}

function WMClock_now() { // @ret Number
    return Date.now() - this._baseTimeDiff;
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

