[![NPM version](http://img.shields.io/npm/v/logia.svg)](https://www.npmjs.org/package/logia)
[![downloads per month](http://img.shields.io/npm/dm/logia.svg)](https://www.npmjs.org/package/logia)
# logia
-----------
Flexible distributed logger with hot-reload support

##### Features
* Control loggers through configuration file during runtime without restarting your application (hot-reload).
* Run both on the server and on the browser.
* Master/slave mode support which allows logger orchestration in distributed systems
* RegExp configuration matchers
* Colored logs
* Log file size limiters
* Remote logging through websockets or http

## Install
 Install with [npm](npmjs.org):
```bash
    $ npm install logia
```
## Use
```javascript
const Logia = require("logia");
const logger = Logia("logger-name");

logger.trace("This is log of level 'trace'");
logger.debug("This is log of level 'debug'");
logger.info("This is log of level 'info'");
logger.warn("This is log of level 'warn'");
logger.error("This is log of level 'error'");
logger.fatal("This is log of level 'fatal'");

```

Logs can also be parameterized
```javascript
const pi = 3.14;
const e = 2.72;

logger.info("Value of 'pi' is '{0}' and value of 'e' is '{1}'", pi, e);
```

When requiring the logia module a ```logia.json``` configuration file is created under a ```config``` folder of the ```current working directory```.
Alternatively we can set the ```LOGIA_CONFIG_FILE_PATH``` environment variable if we want to change the default configuration filename and location.

## Configuration File

```javascript
{
    "level": {
        ".*": null
    },
    "appenders": {
        "$_fill_logger_name_regexp": {
            "filepath": null,
            "maxSize": null
        }
    },
    "remotes": {
        "$_fill_logger_name_regexp": {
            "protocol": null,
            "url": null
        }
    },
    "mode": {
        "type": null,
        "host": null,
        "port": null
    },
    "stdout": false,
    "dateFormat": "(DD-MM-YYYY HH:mm:ss)",
    "overwritable": true
}
```

#### level
In this section we can set the logging level of our loggers. We target loggers by writing a javascript regexp string which matches the name of the loggers and set its level.

For example, below configuration will set all loggers that start with the substring "_database_" to level ```info``` and all loggers that contain the substring "_handler_" to level ```error```;

```javascript
 "level": {
    "^database": "info",
    "*handler": "error"
  }
```

#### appenders
In the appenders section we can define where the logs will be stored in our filesystem. We target loggers by writing a javascript regexp string, the same way we did for the level section but instead for setting the logging level we specify the output file. Moreover we can set the maxSize property in which we specify the maximum size in MBs of the log file. If the size of that file reaches the specified limit then the first half of its contents will be deleted. The filepath is treated as an absolute path unless it starts with ```./``` which then is resolved as a relative path to the current working directory.

For example, below configuration will append the logs of the loggers which name starts with the database-mongo and databse-redis substring to the "/temp/redis.log" and "/temp/mongo.log" files and limit their size to 20MB. Similarly, the logs of loggers with the handler substring in their name will end up in "cwd/logs/handler-errors.log".

```javascript
 "appenders": {
    "^database-mongo": {
        "filepath": "/temp/mongo.log",
        "maxSize": 20
    },
     "^database-redis": {
        "filepath": "/temp/redis.log",
        "maxSize": 20
    },
    "*handler": {
        "filepath": "./logs/handler-errors.log"
    }
  }
```

#### remotes
The remotes section is similar to the appenders section but instead of appending the logs in a file it allows us to send them in a remote location. We need to provide a destination url and a protocol. Supported protocols are websockets and http and both use JSON format.

For example, below configuration will send the logs of the loggers which name starts with the database substring to the websocket server that listens on "websocket.server.com:8989". Similarly, the logs of loggers with the handler substring in their name will be send to the http server that listens on "http.server.com:8080".

```javascript
 "remotes": {
    "^database": {
        "url": "websocket.server.com:8989",
        "protocol": "ws"
    },
    "*handler": {
        "url": "http.server.com:8080",
        "protocol": "http"
    }
  }
```

### mode
Logia can run both as a master or as a slave node.

Below configuration will boot up a master node on localhost:8080.
```javascript
  "mode": {
        "type": "master",
        "host": "master.server.com",
        "port": 8080
    }
```
By running a logia istance as a master node it allows to control all connected slaves through the masters configuration file.

Below configuration will boot up a slave node that will connect to the master node specified above.
```javascript
  "mode": {
        "type": "slave",
        "host": "master.server.com",
        "port": 8080
    }
```
### stdout
By setting this properrty to true all logs will be printed in standard output.

### dateFormat
Set the date format. Uses [momentjs](https://momentjs.com/docs/#/displaying/) display format.

### overwritable
See [Logia.overwriteConfigFile](https://htmlpreview.github.io/?https://github.com/jahnestacado/logia/blob/master/docs/api.html/index.html#LogiaoverwriteConfigFile)

### API
All aforementioned features are also accesible through a programming interface.
Check the API documentation in [Markdown](docs/api.md) or [HTML](https://htmlpreview.github.io/?https://github.com/jahnestacado/logia/blob/master/docs/api.html/index.html)


## License
Copyright (c) 2016 Ioannis Tzanellis<br>
[Released under the MIT license](https://github.com/jahnestacado/chunk2json/blob/master/LICENSE)
