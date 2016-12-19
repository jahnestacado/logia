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
var ActiveLoggerNameLengthHandler = require("./logia-active-name-length-handler.js");
var extend = require("extend");
var ModeHandlerListener = require("./logia-mode-handler-listener.js");

// Attaching listener on the bus
bus.subscribe(EVENT_BUSLINE, ModeHandlerListener);

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

    // Attaching listener on the bus
    var FileTrimmerListener = require("./logia-file-trimmer-listener.js");
    bus.subscribe(EVENT_BUSLINE, FileTrimmerListener);

    bus.subscribe(EVENT_BUSLINE, {
        afterConfigurationChanged: function () {
            LogServer = Utils.setupLogServer(LogServer, RUNTIME_CONFIG, EVENT_BUSLINE);
        }
    });
}

/**
* The Logia module. What require("logia") returns.
* @namespace Logia
* @type {function}
* @param {string} name - The logger name that we want to create/retrieve
* @returns {logger} - The newly created or retrieved logger instance
*/
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

/**
* Overwrites the configuration file on disk if the "overwritable" option is set to true.
* NOOP when executing in the browser.
* @param {object} config - An object that defines any of the {@link LogiaConfig} properties.
* @memberof Logia
*/
LogiaFactory.overwriteConfigFile = function(config) {
    if(IN_SERVER_MODE){
        if(RUNTIME_CONFIG.overwritable){
            extend(RUNTIME_CONFIG, config);
            configFileHandler.writeConfigurationFile(RUNTIME_CONFIG);
        }
    } else {
        console.warn("[LOGIA] overwriteConfigFile function is a NOOP in the browser");
    }
};

/**
* Sets the date format in the logs
* @param {string} format - {@link http://momentjs.com/docs/#/parsing/string  Moment.js} date format
* @memberof Logia
*/
LogiaFactory.setDateFormat = function (format) {
    var newDateFormat = format;
    if(typeof newDateFormat !== "string"){
        newDateFormat = "";
        console.error(("[LOGIA] Invalid 'dateFormat' value: " + format +". Using default date format...").red);
    }
    RUNTIME_CONFIG.dateFormat = newDateFormat;
};

/**
* Sets the global Logia configuration. It doesn't overwrite the configuration file on disk.
* @param {object} config - An object that defines any of the {@link LogiaConfig} properties
* @memberof Logia
*/
LogiaFactory.config = function(config) {
        extend(RUNTIME_CONFIG, config);
        bus[EVENT_BUSLINE] && bus[EVENT_BUSLINE].trigger("configurationChanged");
};

/**
* Enables fullstack mode. Logia configuration is dictated by the specified Logia server.
* NOOP when executing in the server.
* @param {string} url - Url that points to a running Logia server
* @memberof Logia
*/
LogiaFactory.slaveOf = function(url) {
    if(!IN_SERVER_MODE){
        var slaveRemote = Utils.createRemote({protocol: "ws", url: url, tag: "slave"});
        bus[EVENT_BUSLINE].trigger("enableFullstackMode", url);
        slaveRemote.onWsMessage(function(config){
            LogiaFactory.config(config);
        });
    } else {
        console.warn("[LOGIA] slaveOf function is a NOOP in the server");
    }
};

LogiaFactory.server = {
    /**
    * Listens for certain server events.
    * Currently the only supported event is the "log" event which is triggered when Logia server receives a log.
    * @alias server.on
    * @method server.on
    * @memberof Logia
    * @param {string} event
    * @param {function} callback
    */
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
