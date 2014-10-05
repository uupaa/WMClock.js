# WMClock.js [![Build Status](https://travis-ci.org/uupaa/WMClock.js.png)](http://travis-ci.org/uupaa/WMClock.js)

[![npm](https://nodei.co/npm/uupaa.wmclock.js.png?downloads=true&stars=true)](https://nodei.co/npm/uupaa.wmclock.js/)

WMClock.js description.

## Document

- [WMClock.js wiki](https://github.com/uupaa/WMClock.js/wiki/WMClock)
- [WebModule](https://github.com/uupaa/WebModule)
    - [Slide](http://uupaa.github.io/Slide/slide/WebModule/index.html)
    - [Development](https://github.com/uupaa/WebModule/wiki/Development)

## How to use

### Browser

```js
<script src="lib/WMClock.js"></script>
<script>
var clock = new WMClock({ vsync: true }).on(_tick).run();

function _tick(time, delta, count) {
    console.log(time, delta, count);
    if (count > 10) {
        clock.off(_tick);
    }
}
</script>
```

### WebWorkers

```js
importScripts("lib/WMClock.js");

...
```

### Node.js

```js
var WMClock = require("lib/WMClock.js");

...
```
