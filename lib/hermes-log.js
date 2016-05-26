var LOGGERS = {};
var GLOBAL_CONFIG = {
    level: {
        ".*" : null
    },
    stdout: true,
    destFile: {
        ".*" : null
    },
    dateFormat: "MMM DD, YYYY / hh:mm A",
    remote: {
        ".*" : null // {protocol: "ws"|"http", url: ...}
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
var BUSLINE_ID = "__HERMES-LOG__";
var configFileHandler = null;
if(IN_SERVER_MODE){
    var ConfigFileHandler = require("./hermes-log-configuration-file-handler.js");
    configFileHandler = new ConfigFileHandler(GLOBAL_CONFIG, BUSLINE_ID);
}

var bus = require("hermes-bus");
var moment = require("moment");
var colors = require("colors");
var util = require("util");
var HermesLogRemote = require("./hermes-log-remote.js");
var fileAppender = require("./hermes-log-file-appender.js");
var EOL = require("os").EOL;
var extend = require("extend");

var UtilityBelt = {
    constructApi : function(logger){
        Object.keys(LEVELS).forEach(function (key) {
            var level = LEVELS[key].tag;
            logger[level] = function () {
                if (logger.activeLevels.indexOf(level) !== -1) {
                    //Convert arguments to pure array object
                    var args = Array.prototype.slice.call(arguments);
                    // Assign log message to msg variable and remove it from the args array
                    var msg = args.shift();
                    var params = args;
                    UtilityBelt.log(logger, {
                        message: msg,
                        params: params,
                        level: level
                    });
                }
            };
        });
    },
    updateActiveLevels: function (logger) {
        var level = UtilityBelt.getLoggerInstanceProperty(logger.name, "level");
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
        logger.activeLevels = activeLevels;
    },
    getLoggerInstanceProperty: function(loggerName, property){
        var value = null;
        if(GLOBAL_CONFIG[property]){
            Object.keys(GLOBAL_CONFIG[property]).forEach(function(regExpStrKey){
                if(new RegExp(regExpStrKey).test(loggerName)){
                    value = GLOBAL_CONFIG[property][regExpStrKey];
                }
            });
        }
        return value;
    },
    setLoggerInstanceProperty: function(loggerName, property, value){
        var currentValue = GLOBAL_CONFIG[property];
        currentValue[loggerName] = value;
    },
    convertToString: function(value){
        var stringValue;
        var objectToStringWithDepthOne = function(value){
            var result = util.inspect(value, {depth: 0})
                        .split(",")
                        .reduce(function(final, s){
                            return final + s.trim() + ", ";
                        },"");

            return result;
        };

        if(IN_SERVER_MODE){
            stringValue = typeof value === "object" ?  objectToStringWithDepthOne(value) : value.toString();
        } else {
            stringValue = typeof value === "object" ? JSON.stringify(value) : value;
        }

        return stringValue;
    },
    log: function(logger, logObject){
        var formattedLogMsg = UtilityBelt.createLogMessageHeader(logger.name, logObject) + ": " + UtilityBelt.getParameterizedMessage(logObject);
        GLOBAL_CONFIG.stdout && console.log(formattedLogMsg[LEVELS[logObject.level].color]);

        var destFile = UtilityBelt.getLoggerInstanceProperty(logger.name, "destFile");
        IN_SERVER_MODE && destFile && fileAppender.log(formattedLogMsg, fileAppender.getDestFileFullPath(destFile));

        logger.remote.log && logger.remote.log(formattedLogMsg);
    },
    subscribeOnConfigFileChangedListener: function(logger){
        bus.subscribe(BUSLINE_ID, {
            afterConfigurationChanged: function () {
                // Update activeLevels everytime we load configuration
                UtilityBelt.updateActiveLevels(logger);
                var remoteLoggerInstanceConfig = UtilityBelt.getLoggerInstanceProperty(logger.name, "remote");
                logger.remote = UtilityBelt.createRemote(remoteLoggerInstanceConfig);
            }
        });
    },
    getParameterizedMessage: function (logObject) {
        var parameterizedMsg = logObject.message;
        var convertTagToIndex = function (parameterTag) {
            return parameterTag.replace(/({|})/g, "");
        };

        var parameterTags = logObject.message.match(/{(\d)+}/g);
        if (parameterTags && logObject.params) {
            parameterTags.forEach(function (tag) {
                var parameterValue = logObject.params[convertTagToIndex(tag)];
                parameterizedMsg = parameterizedMsg.replace(tag, UtilityBelt.convertToString(parameterValue));
            });
        }

        return parameterizedMsg;
    },
    createLogMessageHeader: function (name, logObject) {
        var timestamp = IN_SERVER_MODE ? moment().format(GLOBAL_CONFIG.dateFormat) : Date();
        return "(" + timestamp + ")["+ logObject.level.toUpperCase() +"]{" + name + "}";
    },
    createRemote: function(remoteLoggerInstanceConfig){
        /*
        * Defaults to empty object {} to minimize checks for validity of HermesLogRemote instance.
        * Hence no need to both check for null value && if the HermesLogRemote is valid(not empty object)
        */
        return remoteLoggerInstanceConfig ? new HermesLogRemote(remoteLoggerInstanceConfig) : {};
    }
};


var HermesLog = function (name) {
    var logger = this;

    logger.name = name;
    UtilityBelt.subscribeOnConfigFileChangedListener();
    UtilityBelt.constructApi(logger);
    var remoteLoggerInstanceConfig = UtilityBelt.getLoggerInstanceProperty(name, "remote");
    logger.remote = UtilityBelt.createRemote(remoteLoggerInstanceConfig);
    UtilityBelt.updateActiveLevels(logger);
};

HermesLog.prototype.stdout = function (isEnabled) {
    GLOBAL_CONFIG.stdout = isEnabled;
};

HermesLog.prototype.setLevel = function (newLogLevel) {
    var logger = this;

    UtilityBelt.setLoggerInstanceProperty(logger.name, "level", newLogLevel);
    UtilityBelt.updateActiveLevels(logger);
};

HermesLog.prototype.setRemote = function (protocol, url) {
    var hermesLog = this;

    var loggerName = hermesLog.name;
    UtilityBelt.setLoggerInstanceProperty(loggerName, "remote", {protocol: protocol, url: url});
    hermesLog.remote = new HermesLogRemote(GLOBAL_CONFIG.remote[loggerName]);
};

HermesLog.prototype.setGlobalConfig = function(config){
    extend(GLOBAL_CONFIG, config);
    configFileHandler && configFileHandler.writeConfigurationFile(GLOBAL_CONFIG);
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
