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
//      testClockTypeError,
        testClockOnOffResultValue,
        testClockOptions,
        testClockAndVSync,
        testClockOnce,
        testClockOnce2,
        // --- VSync ---
        testVSyncOnOffResultValue,
        testVSyncOptions,
    ]).run().clone();


function testClockOnOffResultValue(test, pass, miss) {

    var clock = new WMClock();

    clock.on(_userTick1);

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
    var task = new Task(2, function(err, buffer, task) {
            clock.clear();
            clock.stop();

            if (err) {
                test.done(miss())
            } else {
                test.done(pass())
            }
        });

    var clock = new WMClock();

    clock.on(_userTick1);
    clock.on(_userTick2);
    clock.run();

    var count1 = 0;
    var count2 = 0;

    function _userTick1(time, delta) {
        if (++count1 > 10) {
            task.pass();
        }
    }
    function _userTick2(time, delta) {
        if (++count2 > 10) {
            task.pass();
        }
    }
}

function testClockAndVSync(test, pass, miss) {
    var task = new Task(2, function(err, buffer, task) { // buffer has { clock, vsync }
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

    var clock = new WMClock();
    var vsync = new WMClock({ vsync: true });

    clock.on(_clockTick);
    vsync.on(_vsyncTick);

    clock.run();
    vsync.run();

    var count1 = 0;
    var count2 = 0;

    function _clockTick(time, delta) {
//console.log([time, delta, count].join(","));
        if (++count1 === 59) {
            task.set( "clock", time / 60 ).pass();
        }
    }
    function _vsyncTick(time, delta) {
//console.log([time, delta, count].join(","));
        if (++count2 === 59) {
            task.set( "vsync", time / 60 ).pass();
        }
    }
}

function testClockOnce(test, pass, miss) {
    var clock = new WMClock({ speed: 1000 });

    clock.nth(1, function(time, delta, count) {
        clock.stop();
        test.done(pass())
    });
    clock.run();
}

function testClockOnce2(test, pass, miss) {
    var clock = new WMClock({ speed: 1000 });

    clock.nth(2, function(time, delta, count) {
        if (count === 2) {
            clock.stop();
            test.done(pass())
        } else if (count >= 3) {
            clock.stop();
            test.done(miss())
        }
    });
    clock.run();
}

function testVSyncOnOffResultValue(test, pass, miss) {

    var vsync = new WMClock({ vsync: true });


    vsync.on(_userTick1);

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
    var task = new Task(2, function(err, buffer, task) {
            vsync.clear();
            vsync.stop();

            if (err) {
                test.done(miss())
            } else {
                test.done(pass())
            }
        });

    var vsync = new WMClock({ vsync: true });

    vsync.on(_userTick1);
    vsync.on(_userTick2);
    vsync.run();

    var count1 = 0;
    var count2 = 0;

    function _userTick1(time, delta) {
        if (++count1 > 10) {
            task.pass();
        }
    }
    function _userTick2(time, delta) {
        if (++count2 > 10) {
            task.pass();
        }
    }
}
})((this || 0).self || global);

