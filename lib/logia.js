/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var Config = require("./logia-config.js");
var LogiaUtils = require("./logia-utils.js");
var FileAppender = require("./logia-file-appender.js");
var ActiveLoggerNameLengthHandler = require("./logia-active-name-length-handler.js");

var bus = require("hermes-bus");
var moment = require("moment");
var colors = require("colors");

var LEVELS = require("./logia-levels.js");
var RUNTIME_CONFIG = Config.runtime;
var EVENT_BUSLINE = Config.static.eventBusline;
var IN_SERVER_MODE = Config.static.inServerMode;

var Logia = function (name) {
    var logger = this;
    logger.name = name;
    logger._subscribeBusListeners();
    logger._createLogLevelFunctions();

    logger.appenders = IN_SERVER_MODE ? logger._getLoggerRegexPropertyValues("appenders") : [];
    logger.appenders.forEach(function(appender){
        appender.fullFilePath = FileAppender.getDestFileFullpath(appender.filepath);
    });

    logger.remotes = [];
    var remoteLoggerInstanceConfigs = logger._getLoggerRegexPropertyValues("remotes");
    remoteLoggerInstanceConfigs.forEach(function(remoteLoggerInstanceConfig){
        var remote = LogiaUtils.createRemote(remoteLoggerInstanceConfig);
        logger.remotes.push(remote);
    });

    logger._updateActiveLevels(logger);
};

Logia.prototype._subscribeBusListeners = function(){
    var logger = this;
    bus.subscribe(EVENT_BUSLINE, {
        beforeConfigurationChanged: function () {
            logger.remotes.forEach(function(remote){
                remote.terminate && remote.terminate();
            });
            logger.remotes = [];
        },
        onConfigurationChanged: function () {
            // Update activeLevels everytime we load the configuration
            logger._updateActiveLevels(logger);

            var remoteLoggerInstanceConfigs = logger._getLoggerRegexPropertyValues("remotes");
            remoteLoggerInstanceConfigs.forEach(function(remoteLoggerInstanceConfig){
                var remote = LogiaUtils.createRemote(remoteLoggerInstanceConfig);
                logger.remotes.push(remote);
            });

            if(IN_SERVER_MODE){
                logger.appenders = logger._getLoggerRegexPropertyValues("appenders");
                logger.appenders.forEach(function(appender){
                    appender.fullFilePath = FileAppender.getDestFileFullpath(appender.filepath);
                });
            }
        },
        afterLogToFile: function(name, msg, appender){
            if(logger.name === name){
                FileAppender.log(msg, appender.fullFilePath);
            }
        }
    });
};

Logia.prototype._createLogLevelFunctions = function(){
    var logger = this;
    Object.keys(LEVELS).forEach(function (key) {
        var level = LEVELS[key].tag;
        logger[level] = function () {
            if (logger.activeLevels.indexOf(level) !== -1) {
                //Convert arguments to pure array object
                var args = Array.prototype.slice.call(arguments);
                // Assign log message to msg variable and remove it from the args array
                var msg = args.shift();
                var params = args;
                logger._log({
                    message: msg,
                    params: params,
                    level: level
                });
            }
        };
    });
};

Logia.prototype._getLoggerRegexPropertyValues = function(property){
    var loggerName = this.name;
    var values = [];
    if(RUNTIME_CONFIG[property] && typeof RUNTIME_CONFIG[property] === "object"){
        Object.keys(RUNTIME_CONFIG[property]).forEach(function(regExpStrKey){
            try{
                if(new RegExp(regExpStrKey, "i").test(loggerName)){
                    values.push(RUNTIME_CONFIG[property][regExpStrKey]);
                }
            } catch(error){
                console.error("[LOGIA] todo", error);
            }
        });
    }
    return values;
};

Logia.prototype._updateActiveLevels = function () {
    var logger = this;
    var level = logger._getLoggerRegexPropertyValues("level").pop();
    var activeLevels = [];
    switch (level) {
        case "trace" :
            activeLevels.push(LEVELS.trace.tag);
        case "debug":
            activeLevels.push(LEVELS.debug.tag);
        case "info":
            activeLevels.push(LEVELS.info.tag);
        case "warn":
            activeLevels.push(LEVELS.warn.tag);
        case "error":
            activeLevels.push(LEVELS.error.tag);
        case "fatal":
            activeLevels.push(LEVELS.fatal.tag);
    }
    logger.activeLevels = activeLevels;
};

Logia.prototype._log = function(logSpecs){
    var logger = this;
    var timestamp = moment().format(RUNTIME_CONFIG.dateFormat);
    var logObj = {
        name: logger.name,
        level: logSpecs.level,
        timestamp: timestamp,
        message: logger._createLogMessageHeader(timestamp, logSpecs.level)
                + " : "
                + colors.cyan(LogiaUtils.getParameterizedMessage(logSpecs)),
    };

    RUNTIME_CONFIG.stdout && bus[EVENT_BUSLINE].triggerDefaultStdoutLog(logObj.message, logObj.level);
    bus[EVENT_BUSLINE].triggerDefaultAppendersLog(logger, logObj);
    bus[EVENT_BUSLINE].triggerRemoteLog(logger, logObj);
};

Logia.prototype._setProperty = function(propertyName, value){
    var loggerName = this.name;
    var currentValue = RUNTIME_CONFIG[propertyName];
    currentValue[loggerName] = value;
};

Logia.prototype._createLogMessageHeader = function (timestamp, level) {
    var logger  = this;
    var loggerName = logger.name;
    var levelInfo = LEVELS[level];
    return  timestamp
            + " " + colors[levelInfo.color](levelInfo.pretty)
            + " [" + loggerName + "]"
            + LogiaUtils.repeat(" ", ActiveLoggerNameLengthHandler.getMax() - loggerName.length);
};

Logia.prototype.stdout = function (isEnabled) {
    RUNTIME_CONFIG.stdout = isEnabled;
};

Logia.prototype.setLevel = function (newLogLevel) {
    var logger = this;
    logger._setProperty("level", newLogLevel);
    logger._updateActiveLevels(logger);
};

Logia.prototype.setAppender = function (appenderOptions) {
    if(IN_SERVER_MODE){
        var logger = this;
        logger._setProperty("appenders", appenderOptions);
    } else{
        console.warn("[LOGIA] setAppender function is a No-Op in the browser");
    }
};

Logia.prototype.setRemote = function (protocol, url) {
    var logger = this;
    var loggerName = logger.name;
    logger._setProperty("remotes", {protocol: protocol, url: url});
    logger.remotes = [LogiaUtils.createRemote(RUNTIME_CONFIG.remotes[loggerName])];
};

module.exports = Logia;
