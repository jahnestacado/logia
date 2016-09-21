/**
* curtainjs <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var LOGGERS = {};
var GLOBAL_CONFIG = require("./logia-init-config.js");
var LEVELS = require("./logia-levels.js");
var LEVEL_NAME_MAX_LENGTH = Object.keys(LEVELS).sort()[0].length;
var LOGGER_NAME_MAX_LENGTH = 0;
var LEVEL_NAMES_PRETTY_PRINT_FORMATTING = {};
var IN_SERVER_MODE = typeof window === "undefined" ? true : false;
var BUSLINE_ID = "__LOGIA__";

var bus = require("hermes-bus");
var moment = require("moment");
var colors = require("colors");
var LogiaUtils = require("./logia-utils.js")
var extend = require("extend");

Object.keys(LEVELS).forEach(function(level){
    LEVEL_NAMES_PRETTY_PRINT_FORMATTING[level] = LogiaUtils.centerAlignString(level.toUpperCase(), LEVEL_NAME_MAX_LENGTH);
});

bus.subscribe(BUSLINE_ID, {
    afterConfigurationChanged: function () {
        // setDateFormat ensures validity of dateFormat value
        ModuleConstructor.setDateFormat(GLOBAL_CONFIG.dateFormat);
    }
});

var ConfigFileHandler = null;
var ON_SERVER_MSG_LISTENERS = [];
var FileAppender = null;
if(IN_SERVER_MODE){
    FileAppender = require("./logia-file-appender.js");

    var logServer = null;
    var LogFileTrimmer = require("./logia-file-trimmer.js");
    var LogFileTrimmer = new LogFileTrimmer(BUSLINE_ID);

    var ConfigFileHandler = require("./logia-configuration-file-handler.js");
    ConfigFileHandler = new ConfigFileHandler(GLOBAL_CONFIG, BUSLINE_ID);

    bus.subscribe(BUSLINE_ID, {
        afterConfigurationChanged: function () {
            logServer = LogiaUtils.setupLogServer(logServer, GLOBAL_CONFIG, BUSLINE_ID, ON_SERVER_MSG_LISTENERS);
        }
    });

    logServer = LogiaUtils.setupLogServer(logServer, GLOBAL_CONFIG, BUSLINE_ID, ON_SERVER_MSG_LISTENERS);
}

var Logia = function (name) {
    var logger = this;
    logger.name = name;
    LogiaUtils.subscribeBusListeners(logger, BUSLINE_ID);
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
    if(GLOBAL_CONFIG[property] && typeof GLOBAL_CONFIG[property] === "object"){
        Object.keys(GLOBAL_CONFIG[property]).forEach(function(regExpStrKey){
            try{
                if(new RegExp(regExpStrKey, "i").test(loggerName)){
                    values.push(GLOBAL_CONFIG[property][regExpStrKey]);
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
        case"warn":
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
    var timestamp = moment().format(GLOBAL_CONFIG.dateFormat);
    var logObj = {
        name: logger.name,
        level: logSpecs.level,
        timestamp: timestamp,
        message: logger._createLogMessageHeader(timestamp, logSpecs.level) + " : " + LogiaUtils.getParameterizedMessage(logSpecs),
    };

    GLOBAL_CONFIG.stdout && console.log(logObj.message[LEVELS[logSpecs.level].color]);

    logger.appenders.forEach(function(appender){
        if(appender.fullFilePath){
            bus[BUSLINE_ID].triggerLogToFile(logObj.name, logObj.message, appender);
        }
    });

    logger.remotes.forEach(function(remote){
        remote.log(logObj);
    });
};

Logia.prototype._setProperty = function(propertyName, value){
    var loggerName = this.name;
    var currentValue = GLOBAL_CONFIG[propertyName];
    currentValue[loggerName] = value;
};

Logia.prototype._createLogMessageHeader = function (timestamp, level) {
    var loggerName = this.name;
    return  timestamp
            + " ["+ LEVEL_NAMES_PRETTY_PRINT_FORMATTING[level] + "]"
            + " [" + loggerName + "]" + LogiaUtils.repeat(" ", LOGGER_NAME_MAX_LENGTH - loggerName.length);
};

Logia.prototype.stdout = function (isEnabled) {
    GLOBAL_CONFIG.stdout = isEnabled;
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
    // logger.remote = new LogiaRemote(GLOBAL_CONFIG.remotes[loggerName]);
    logger.remotes = [LogiaUtils.createRemote(GLOBAL_CONFIG.remotes[loggerName])];
};

var ModuleConstructor = function(name) {
    var logger;
    if(LOGGERS[name]){
        logger = LOGGERS[name];
    } else {
        LOGGER_NAME_MAX_LENGTH = Math.max(LOGGER_NAME_MAX_LENGTH, name.length);
        logger = new Logia(name);
        LOGGERS[name] = logger;
    }
    return logger;
};

ModuleConstructor.overwriteConfigFile = function(config) {
    if(ConfigFileHandler && GLOBAL_CONFIG.overwritable){
        extend(GLOBAL_CONFIG, config);
        ConfigFileHandler.writeConfigurationFile(GLOBAL_CONFIG);
    }
};

ModuleConstructor.config = function(config) {
        extend(GLOBAL_CONFIG, config);
        bus[BUSLINE_ID] && bus[BUSLINE_ID].trigger("configurationChanged");
};

ModuleConstructor.slaveOf = function(targetUrl) {
    var slaveRemote = LogiaUtils.createRemote({protocol: "ws", url: targetUrl, tag: "slave"});
    slaveRemote.onWsMessage(function(config){
        ModuleConstructor.config(config);
    });
};

ModuleConstructor.setDateFormat = function (format) {
    var newDateFormat = format;
    if(typeof newDateFormat !== "string"){
        newDateFormat = "";
        console.error(("[LOGIA] Invalid 'dateFormat' value: " + format +". Using default date format...").red);
    }
    GLOBAL_CONFIG.dateFormat = newDateFormat;
};

ModuleConstructor.server = {
    on: function(event, listener){
        switch (event) {
            case "log":
                ON_SERVER_MSG_LISTENERS.push(listener);
                break;
            default: console.error("[LOGIA] Unknown event name: '" + event + "'");
        }
    }
}

module.exports = ModuleConstructor;
