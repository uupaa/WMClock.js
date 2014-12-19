var ModuleTestWMClock = (function(global) {

var _runOnNode = "process" in global;
var _runOnWorker = "WorkerLocation" in global;
var _runOnBrowser = "document" in global;

return new Test("WMClock", {
        disable:    false,
        browser:    true,
        worker:     true,
        node:       true,
        button:     true,
        both:       true, // test the primary module and secondary module
    }).add([
        testClockOnOffResultValue,
        testClockOptions,
        testClockAndVSync,
        testClockOnce,
        testClockOnce2,
        // --- VSync ---
        testVSyncOnOffResultValue,
        testVSyncOptions,
        testVSyncPulse,
        // ---
        testClockSetBaseTime,
        testClockSetBaseTime0,
    ]).run().clone();


function testClockOnOffResultValue(test, pass, miss) {

    var clock = new WMClock([_userTick1]);

    var result2 = clock.has(_userTick1) === true; // true

    clock.off(_userTick1);

    var result4 = clock.has(_userTick1) === false; // true

    clock.on(_userTick1);  // true
    clock.on(_userTick2);  // true

    clock.clear();         // true (all unregister)

    if (result2 === true &&
        result4 === true) {

        clock.clear();
        test.done(pass())
    } else {
        clock.clear();
        test.done(miss())
    }

    function _userTick1() { }
    function _userTick2() { }
}

function testClockOptions(test, pass, miss) {
    var task = new TestTask(2, function(err, buffer, task) {
            clock.clear();
            clock.stop();

            if (err) {
                test.done(miss())
            } else {
                test.done(pass())
            }
        });

    var clock = new WMClock([_userTick1, _userTick2], { start: true });

    function _userTick1(timeStamp, deltaTime, count) {
        if (count > 10) {
            task.pass();
        }
    }
    function _userTick2(timeStamp, deltaTime, count) {
        if (count > 10) {
            task.pass();
        }
    }
}

function testClockAndVSync(test, pass, miss) {
    var task = new TestTask(2, function(err, buffer, task) { // buffer has { clock, vsync }
            clock.clear();
            vsync.clear();

            clock.stop();
            vsync.stop();

            var clockValue = buffer.clock;
            var vsyncValue = buffer.vsync;

            console.log("clock: " + clockValue + ", vsync: " + vsyncValue);

            if (err || !clockValue || !vsyncValue) {
                test.done(miss())
            } else {
                test.done(pass())
            }
        });

    var clock = new WMClock([_clockTick], { start: true });
    var vsync = new WMClock([_vsyncTick], { start: true, vsync: true });

    function _clockTick(timeStamp, deltaTime, count) {
        if (count === 59) {
            task.set( "clock", timeStamp / 60 ).pass();
        }
    }
    function _vsyncTick(timeStamp, deltaTime, count) {
        if (count === 59) {
            task.set( "vsync", timeStamp / 60 ).pass();
        }
    }
}

function testClockOnce(test, pass, miss) {
    var clock = new WMClock([], { start: true, speed: 1000 });

    clock.nth(function(timeStamp, deltaTime, count) {
        clock.stop();
        test.done(pass())
    });
}

function testClockOnce2(test, pass, miss) {
    var clock = new WMClock([], { start: true, speed: 1000 });

    clock.nth(function(timeStamp, deltaTime, count) {
        switch (count) {
        case 1:
            clock.stop();
            test.done(pass());
            break;
        case 2:
            clock.stop();
            test.done(miss());
        }
    }, 2);
}

function testVSyncOnOffResultValue(test, pass, miss) {

    var vsync = new WMClock([_userTick1], { vsync: true });

    var result2 = vsync.has(_userTick1) === true; // true

    vsync.off(_userTick1);

    var result4 = vsync.has(_userTick1) === false; // true

    vsync.on(_userTick1);  // true
    vsync.on(_userTick2);  // true

    vsync.clear();         // true (all unregister)

    if (result2 === true &&
        result4 === true) {

        vsync.clear()
        test.done(pass())
    } else {
        vsync.clear()
        test.done(miss())
    }

    function _userTick1() { }
    function _userTick2() { }
}

function testVSyncOptions(test, pass, miss) {
    var task = new TestTask(2, function(err, buffer, task) {
            vsync.clear();
            vsync.stop();

            if (err) {
                test.done(miss())
            } else {
                test.done(pass())
            }
        });

    var vsync = new WMClock([_userTick1, _userTick2], { start: true, vsync: true });

    function _userTick1(timeStamp, deltaTime, count) {
        if (count > 10) {
            task.pass();
        }
    }
    function _userTick2(timeStamp, deltaTime, count) {
        if (count > 10) {
            task.pass();
        }
    }
}

function testVSyncPulse(test, pass, miss) {
    var task = new TestTask(10, function(err, buffer, task) {
            clock.clear();
            clock.stop();

            if (err) {
                test.done(miss())
            } else {
                test.done(pass())
            }
        });

    var clock = new WMClock([], { vsync: false, speed: 100, pulse: 20, baseTime: 0 });

    clock.nth(_tick, 10);
    clock.start();

    function _tick(timeStamp, deltaTime, count) {
        console.log({ timeStamp:timeStamp, deltaTime:deltaTime, count:count });

        // deltaTime は初回が0で、それ以降は常に20になる(pulseが20なので)
        // speedが100なので 100ms 毎に呼ばれるが、timeStampは20msずつ増える
        if (timeStamp === (timeStamp | 0)) {
            if (timeStamp % 20 === 0) {
                if (deltaTime === 0 || deltaTime === 20) {
                    task.pass();
                    return;
                }
            }
        }
        task.miss();
    }
}

function testClockSetBaseTime(test, pass, miss) {
    var now1 = Date.now();
    var clock = new WMClock([], { vsync: false, baseTime: Date.now() });
    var now2 = clock.now();

    console.log("now: ", now1, now2);

    if (now2 >= now1) {
        if (now2 <= now1 + 10) {
            test.done(pass())
            return;
        }
    }
    test.done(miss())
}

function testClockSetBaseTime0(test, pass, miss) {
    var clock = new WMClock([], { vsync: false, baseTime: 0 });
    var now = clock.now();

    console.log("now: ", now);

    if (now < 10) {
        test.done(pass())
        return;
    }
    test.done(miss())
}


})((this || 0).self || global);

