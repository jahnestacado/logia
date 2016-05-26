var LOGGERS = {};
var GLOBAL_CONFIG = {
    logLevel: {
        "global" : null
    },
    stdout: true,
    destFile: null,
    dateFormat: "MMM DD, YYYY / hh:mm A",
    remote: {
        "global" : null // {type: "ws"|"http", url: ...}
    }
};
var LEVELS = {
    fatal: {tag: "fatal", color: "red"},
    error: {tag: "error", color: "red"},
    warn: {tag: "warn", color: "yellow"},
    info: {tag: "info", color: "green"},
    debug: {tag: "debug", color: "green"},
    trace: {tag: "trace", color: "green"}
};

var IN_SERVER_MODE = typeof window === "undefined" ? true : false;
var configFileHandler = require("./hermes-log-configuration-file-handler.js");
IN_SERVER_MODE && configFileHandler.activate(GLOBAL_CONFIG);

var bus = require("hermes-bus");
var moment = require("moment");
var colors = require("colors");
var util = require('util');
var HermesLogRemote = require("./hermes-log-remote.js");
var fileAppender = require("./hermes-log-file-appender.js");
var EOL = require("os").EOL;
var extend = require("extend");

var HermesLog = function (name) {
    var hermesLog = this;

    hermesLog.name = name;
    hermesLog.subscribeEventListeners(name);
    hermesLog.subscribeOnConfigFileChangedListener();
    hermesLog.constructApi(name);
    var remoteLoggerInstanceConfig = GLOBAL_CONFIG.remote[hermesLog.name] || GLOBAL_CONFIG.remote.global;
    hermesLog.remote = remoteLoggerInstanceConfig ? new HermesLogRemote(remoteLoggerInstanceConfig) : null;
    hermesLog.updateActiveLevels();
};

HermesLog.prototype.constructApi = function (name) {
    var hermesLog = this;

    Object.keys(LEVELS).forEach(function (key) {
        var level = LEVELS[key].tag;

        hermesLog[level] = function () {
            if (hermesLog.activeLevels.indexOf(level) !== -1) {
                //Convert arguments to pure array object
                var args = Array.prototype.slice.call(arguments);
                // Assign log message to msg variable and remove it from the args array
                var msg = args.shift();
                var params = args;
                bus[name].triggerLogEvent({
                    message: msg,
                    params: params,
                    level: level
                });
            }
        };
    });
};

HermesLog.prototype.stdout = function (isEnabled) {
    GLOBAL_CONFIG.stdout = isEnabled;
};

HermesLog.prototype.setLevel = function (newLogLevel) {
    var hermesLog = this;

    hermesLog.setLoggerInstanceProperty("logLevel", newLogLevel);
    hermesLog.updateActiveLevels();
};

HermesLog.prototype.setLoggerInstanceProperty = function(property, value){
    var hermesLog = this;

    var currentValue = GLOBAL_CONFIG[property];
    var loggerName = hermesLog.name;
    currentValue[loggerName] = value;
};

HermesLog.prototype.setRemote = function (type, url) {
    var hermesLog = this;

    hermesLog.setLoggerInstanceProperty("remote", {type: type, url: url});
    var loggerName = hermesLog.name;
    hermesLog.remote = new HermesLogRemote(GLOBAL_CONFIG.remote[loggerName]);
};

HermesLog.prototype.updateActiveLevels = function () {
    var hermesLog = this;

    var level = hermesLog.getLoggerInstanceProperty("logLevel");
    var activeLevels = [];
    switch (level) {
        case "trace" :
            activeLevels.push(LEVELS.trace.tag);
        case"debug":
            activeLevels.push(LEVELS.debug.tag);
        case "info":
            activeLevels.push(LEVELS.info.tag);
        case"warn":
            activeLevels.push(LEVELS.warn.tag);
        case "error":
            activeLevels.push(LEVELS.error.tag);
        case "fatal":
            activeLevels.push(LEVELS.fatal.tag);
    }

    hermesLog.activeLevels = activeLevels;
};

HermesLog.prototype.getLoggerInstanceProperty  = function(property){
    var hermesLog = this;

	var loggerName = hermesLog.name;
	var value = GLOBAL_CONFIG[property] && GLOBAL_CONFIG[property][loggerName];

	return value || GLOBAL_CONFIG[property].global;
};

HermesLog.prototype.constructLogMessageHeader = function (name, logObject) {
    var timestamp = IN_SERVER_MODE ? moment().format(GLOBAL_CONFIG.dateFormat) : Date();
    return "(" + timestamp + ")["+ logObject.level.toUpperCase() +"]{" + name + "}";
};

HermesLog.prototype.getParameterizedMessage = function (logObject) {
    var hermesLog = this;

    var parameterizedMsg = logObject.message;
    var convertTagToIndex = function (parameterTag) {
        return parameterTag.replace(/({|})/g, "");
    };

    var parameterTags = logObject.message.match(/{(\d)+}/g);

    if (parameterTags && logObject.params) {
        parameterTags.forEach(function (tag) {
            var parameterValue = logObject.params[convertTagToIndex(tag)];
            parameterizedMsg = parameterizedMsg.replace(tag, hermesLog.convertToString(parameterValue));
        });
    }

    return parameterizedMsg;
};

HermesLog.prototype.convertToString = function(value){
    var stringValue;
    var objectToStringWithDepthOne = function(value){
        var result = util.inspect(value, {depth: 0}).split(",").reduce(
            function(final, s){
                return final + s.trim() + ", ";
            },"");

            return result;
        };

        if(IN_SERVER_MODE){
            stringValue = typeof value === "object" ?  objectToStringWithDepthOne(value) : value.toString();
        } else{
            stringValue = typeof value === "object" ? JSON.stringify(value) : value;
        }

        return stringValue;
    };

HermesLog.prototype.subscribeEventListeners = function (name) {
    var hermesLog = this;

    if(!(bus[name] && bus[name].hasEvent("logEvent"))){
        bus.subscribe(name, {
            onLogEvent: function (logObject) {
                var formattedLogMsg = hermesLog.constructLogMessageHeader(name, logObject) + ": " + hermesLog.getParameterizedMessage(logObject);

                GLOBAL_CONFIG.stdout && console.log(formattedLogMsg[LEVELS[logObject.level].color]);

                var destFile = hermesLog.getLoggerInstanceProperty("destFile");
			    IN_SERVER_MODE && destFile && fileAppender.logToFile(formattedLogMsg, fileAppender.getDestFileFullPath(destFile));

                hermesLog.remote && hermesLog.remote.send(formattedLogMsg);
            },
        });
    }
};

HermesLog.prototype.subscribeOnConfigFileChangedListener = function(){
    var hermesLog = this;

    bus.subscribe({
        afterConfigurationChanged: function () {
            // Update activeLevels everytime we load configuration
            hermesLog.updateActiveLevels();
            var remoteLoggerInstanceConfig = GLOBAL_CONFIG.remote[hermesLog.name] || GLOBAL_CONFIG.remote.global;
            hermesLog.remote = remoteLoggerInstanceConfig ? new HermesLogRemote(remoteLoggerInstanceConfig) : null;
        }
    });
};

HermesLog.prototype.setGlobalConfig = function(config){
    extend(GLOBAL_CONFIG, config);
    IN_SERVER_MODE && configFileHandler.writeConfigurationFile(GLOBAL_CONFIG);
};

var Constructor = function(name){
    var logger;

    if(LOGGERS[name]){
        logger = LOGGERS[name];
    } else{
        logger = new HermesLog(name);
        LOGGERS[name] = logger;
    }

    return logger;
};

module.exports = Constructor;
