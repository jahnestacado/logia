var LOGGERS = {};
var GLOBAL_CONFIG = {
    level: {
        ".*" : null
    },
    destFile: {
        ".*" : null
    },
    remote: {
        ".*" : null // {protocol: "ws"|"http", url: ...}
    },
    stdout: false,
    locked: false,
    dateFormat: "MMM DD, YYYY / hh:mm A"
};
var LEVELS = {
    fatal: {tag: "fatal", color: "red"},
    error: {tag: "error", color: "red"},
    warn: {tag: "warn", color: "yellow"},
    info: {tag: "info", color: "green"},
    debug: {tag: "debug", color: "green"},
    trace: {tag: "trace", color: "green"}
};
var LEVEL_NAME_MAX_LENGTH = Object.keys(LEVELS).sort()[0].length;
var LOGGER_NAME_MAX_LENGTH = 5;

var LEVEL_NAMES_PRETTY_PRINT_FORMATTING = {};
var LOGGER_NAMES_PRETTY_PRINT_FORMATTING = {};

var IN_SERVER_MODE = typeof window === "undefined" ? true : false;
var BUSLINE_ID = "__HERMES-LOG__";

var bus = require("hermes-bus");
var moment = require("moment");
var colors = require("colors");
var util = require("util");
var HermesLogRemote = require("./hermes-log-remote.js");
var EOL = require("os").EOL;
var extend = require("extend");

var UtilityBelt = {
    createLogLevelFunctions : function(logger){
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
            case "debug":
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
    toPrettyString: function(value){
        /* This is the implementation for browser mode. In Server mode the function is overridden below */
        var stringValue = typeof value === "object" ? JSON.stringify(value) : value;
        return stringValue;
    },
    toReadableStringOfDepthOne: function(value){
        var result = util.inspect(value, {depth: 0})
                    .split(",")
                    .reduce(function(final, s){
                        return final + s.trim() + ", ";
                    },"");

        return result;
    },
    log: function(logger, logObject){
        var formattedLogMsg = UtilityBelt.createLogMessageHeader(logger.name, logObject) + ": " + UtilityBelt.getParameterizedMessage(logObject);
        GLOBAL_CONFIG.stdout && console.log(formattedLogMsg[LEVELS[logObject.level].color]);

        UtilityBelt.logToFile(logger, formattedLogMsg);

        logger.remote.log(formattedLogMsg);
    },
    logToFile: function(logger, formattedLogMsg){
        /* No-Op when running in browser */
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
        var params = logObject.params;
        var numOfParams = params.length;
        var i = 0;
        for(i; i < numOfParams; i++){
            var parameterValue = UtilityBelt.toPrettyString(params[i]);
            parameterizedMsg = parameterizedMsg.replace(new RegExp("\\{" + i +"\\}", "g"), parameterValue);
        }

        return parameterizedMsg;
    },
    createLogMessageHeader: function (name, logObject) {
        var timestamp = IN_SERVER_MODE ? moment().format(GLOBAL_CONFIG.dateFormat) : Date();
        return "(" + timestamp + ")"
                + " ["+ LEVEL_NAMES_PRETTY_PRINT_FORMATTING[logObject.level] + "]"
                + " {" + LOGGER_NAMES_PRETTY_PRINT_FORMATTING[name] + "}";
    },
    extendStringLength: function(str, length){
        var strLength = str.length;
        var extendedStr = str;
        if(strLength < length){
            extendedStr += " ".repeat(length - strLength);
        }
        return extendedStr;
    },
    createRemote: function(remoteLoggerInstanceConfig){
        /*
        * Minimize checks for validity of HermesLogRemote instance by using a No-Op.
        */
        var remote = {log: function(){/* No-Op*/}};
        if(remoteLoggerInstanceConfig){
            var hermesLogRemote = new HermesLogRemote(remoteLoggerInstanceConfig);
            remote = hermesLogRemote.log ? hermesLogRemote : remote
        }

        return remote;
    }
};

var configFileHandler = null;
var fileAppender = null;
if(IN_SERVER_MODE){
    var ConfigFileHandler = require("./hermes-log-configuration-file-handler.js");
    configFileHandler = new ConfigFileHandler(GLOBAL_CONFIG, BUSLINE_ID);

    fileAppender = require("./hermes-log-file-appender.js");
    UtilityBelt.logToFile = function(logger, formattedLogMsg){
        var destFile = UtilityBelt.getLoggerInstanceProperty(logger.name, "destFile");
        destFile && fileAppender.log(formattedLogMsg, fileAppender.getDestFileFullPath(destFile));
    };

    UtilityBelt.toPrettyString = function(value){
        var stringValue = typeof value === "object" ?  UtilityBelt.toReadableStringOfDepthOne(value) : value.toString();
        return stringValue;
    };

    Object.keys(LEVELS).forEach(function(level){
        LEVEL_NAMES_PRETTY_PRINT_FORMATTING[level] = UtilityBelt.extendStringLength(level.toUpperCase(), LEVEL_NAME_MAX_LENGTH);
    });
}

var HermesLog = function (name) {
    var logger = this;
    logger.name = name;
    UtilityBelt.subscribeOnConfigFileChangedListener(logger);
    UtilityBelt.createLogLevelFunctions(logger);
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

HermesLog.prototype.setConfig = function(config){
    delete config.locked;
    if(configFileHandler && !GLOBAL_CONFIG.locked){
        extend(GLOBAL_CONFIG, config);
        configFileHandler.writeConfigurationFile(GLOBAL_CONFIG);
    }
};

var Constructor = function(name){
    var logger;
    if(LOGGERS[name]){
        logger = LOGGERS[name];
    } else{
        LOGGER_NAME_MAX_LENGTH = Math.max(LOGGER_NAME_MAX_LENGTH, name.length);
        LOGGER_NAMES_PRETTY_PRINT_FORMATTING[name] = UtilityBelt.extendStringLength(name, LOGGER_NAME_MAX_LENGTH);
        logger = new HermesLog(name);
        LOGGERS[name] = logger;
    }
    return logger;
};

module.exports = Constructor;
