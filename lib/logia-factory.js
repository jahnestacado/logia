/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var Config = require("./logia-config.js");
var RUNTIME_CONFIG = Config.runtime;
var EVENT_BUSLINE = Config.static.eventBusline;
var IN_SERVER_MODE = Config.static.inServerMode;
var LOGGERS = {};

var bus = require("hermes-bus");
var Utils = require("./logia-utils.js");
var Logia = require("./logia.js");
var LogiaModeHandler = require("./logia-mode-handler.js")(EVENT_BUSLINE);
var ActiveLoggerNameLengthHandler = require("./logia-active-name-length-handler.js");
var extend = require("extend");

bus.subscribe(EVENT_BUSLINE, {
    afterConfigurationChanged: function () {
        // setDateFormat ensures validity of dateFormat value
        LogiaFactory.setDateFormat(RUNTIME_CONFIG.dateFormat);
    }
});

if(IN_SERVER_MODE){
    var ConfigFileHandler = require("./logia-configuration-file-handler.js");
    var configFileHandler = new ConfigFileHandler(RUNTIME_CONFIG, EVENT_BUSLINE);

    var LogServer = Utils.setupLogServer(null, RUNTIME_CONFIG, EVENT_BUSLINE);

    bus.require(__dirname, "logia-file-trimmer-listener.js");

    bus.subscribe(EVENT_BUSLINE, {
        afterConfigurationChanged: function () {
            LogServer = Utils.setupLogServer(LogServer, RUNTIME_CONFIG, EVENT_BUSLINE);
        }
    });
}

var LogiaFactory = function(name) {
    var logger;
    if(LOGGERS[name]){
        logger = LOGGERS[name];
    } else {
        ActiveLoggerNameLengthHandler.update(name);
        logger = new Logia(name);
        LOGGERS[name] = logger;
    }
    return logger;
};

LogiaFactory.overwriteConfigFile = function(config) {
    if(IN_SERVER_MODE){
        if(RUNTIME_CONFIG.overwritable){
            extend(RUNTIME_CONFIG, config);
            configFileHandler.writeConfigurationFile(RUNTIME_CONFIG);
        }
    } else {
        console.warn("No-op");
    }
};

LogiaFactory.setDateFormat = function (format) {
    var newDateFormat = format;
    if(typeof newDateFormat !== "string"){
        newDateFormat = "";
        console.error(("[LOGIA] Invalid 'dateFormat' value: " + format +". Using default date format...").red);
    }
    RUNTIME_CONFIG.dateFormat = newDateFormat;
};

LogiaFactory.config = function(config) {
        extend(RUNTIME_CONFIG, config);
        bus[EVENT_BUSLINE] && bus[EVENT_BUSLINE].trigger("configurationChanged");
};

LogiaFactory.slaveOf = function(targetUrl) {
    // @TODO Browser only
    var slaveRemote = Utils.createRemote({protocol: "ws", url: targetUrl, tag: "slave"});
    bus[EVENT_BUSLINE].trigger("enableFullstackMode", targetUrl);
    slaveRemote.onWsMessage(function(config){
        LogiaFactory.config(config);
    });
};


LogiaFactory.server = {
    // @TODO Server only
    on: function(event, listener){
        switch (event) {
            case "log":
                bus.subscribe(EVENT_BUSLINE, {
                    onRemoteLogReceived: function(logObj){
                        listener(logObj);
                    }
                });
                break;
            default: console.error("[LOGIA] Unknown event name: '" + event + "'");
        }
    }
};

module.exports = LogiaFactory;
