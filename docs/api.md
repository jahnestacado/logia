# Logia

The Logia module. The returned value of require("logia").

**Parameters**

-   `name` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The logger name that we want to create/retrieve

Returns **[logger](#logger)** The newly created or retrieved logger instance

## overwriteConfigFile

Overwrites the configuration file on disk if the "overwritable" option is set to true.
NOOP when executing in the browser.

**Parameters**

-   `config` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** An object that defines any of the [LogiaConfig](#logiaconfig) properties.

## setDateFormat

Sets the date format in the logs.

**Parameters**

-   `format` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** [ Moment.js](http://momentjs.com/docs/#/parsing/string) date format

## config

Sets the global Logia configuration. It doesn't overwrite the configuration file on disk.

**Parameters**

-   `config` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** An object that defines any of the [LogiaConfig](#logiaconfig) properties

## enterSlaveMode

Enters slave mode. Logia configuration is dictated by the specified Logia master node.

**Parameters**

-   `options` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** Logia master server location info.
    -   `options.host` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 
    -   `options.port` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** 

## exitSlaveMode

Exits slave mode. Logia configuration is based on local configuration file again.

## enterMasterMode

Enters master mode. A master Logia node can command multiple slave nodes through via the master node configuration mechanism.

**Parameters**

-   `options` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** Logia master server info.
-   `options.host.null` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 
-   `options.port.null` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** 

## exitMasterMode

Exits master mode.

## server.on

Listens for certain server events.
Currently the only supported event is the "log" event which is triggered when Logia server receives a log.

**Parameters**

-   `event` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 
-   `callback` **[function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function)** 

# LogiaConfig

The Logia configuration object.

**Properties**

-   `level` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** 
-   `appenders` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** 
-   `remotes` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** 
-   `server` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** 
-   `stdout` **[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** 
-   `dateFormat` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 
-   `overwritable` **[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** 

## level

We can define n-number of logger-name regexp properties in level

**Properties**

-   `logger_name_regexp` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** (fatal|error|warn|info|debug|trace).

## appenders

We can define n-number of logger-name regexp properties in appenders

**Properties**

-   `logger_name_regexp` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** {filepath: {string}, maxSize: {number}}

## remotes

We can define n-number of logger-name regexp properties in remotes

**Properties**

-   `logger_name_regexp` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** {protocol: {string}, url: {string}}

## mode

Run Logia either as a master or slave instance

**Properties**

-   `type` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** (master|slave)
-   `host` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 
-   `port` **[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)** 

# logger

Logia logger instance.

## warn

Log in warn level

**Parameters**

-   `text` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** It can be parameterized by using "{0}".."{n}" placeholders
-   `parameters` **...Any** n-th parameter replaces "{n}" placeholder in log text

## info

Log in info level

**Parameters**

-   `text` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** It can be parameterized by using "{0}".."{n}" placeholders
-   `parameters` **...Any** n-th parameter replaces "{n}" placeholder in log text

## trace

Log in trace level

**Parameters**

-   `text` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** It can be parameterized by using "{0}".."{n}" placeholders
-   `parameters` **...Any** n-th parameter replaces "{n}" placeholder in log text

## error

Log in error level

**Parameters**

-   `text` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** It can be parameterized by using "{0}".."{n}" placeholders
-   `parameters` **...Any** n-th parameter replaces "{n}" placeholder in log text

## fatal

Log in fatal level

**Parameters**

-   `text` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** It can be parameterized by using "{0}".."{n}" placeholders
-   `parameters` **...Any** n-th parameter replaces "{n}" placeholder in log text

## debug

Log in debug level

**Parameters**

-   `text` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** It can be parameterized by using "{0}".."{n}" placeholders
-   `parameters` **...Any** n-th parameter replaces "{n}" placeholder in log text

## stdout

Enables/disables stdout of logger

**Parameters**

-   `isEnabled` **[boolean](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean)** 

Returns **[logger](#logger)** 

## setLevel

Sets logger level

**Parameters**

-   `newLogLevel` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 

Returns **[logger](#logger)** 

## setAppender

Sets logger file appender

**Parameters**

-   `appenderOptions` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** See [LogiaConfig](#logiaconfig)

Returns **[logger](#logger)** 

## setRemote

Sets loggers remote

**Parameters**

-   `protocol` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** "ws"|"http"
-   `url` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** 

Returns **[logger](#logger)** 
