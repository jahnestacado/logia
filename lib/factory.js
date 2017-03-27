/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var Config = require("./config.js");
var RUNTIME_CONFIG = Config.runtime;
var EVENT_BUSLINE = Config.static.eventBusline;
var IN_SERVER_MODE = Config.static.inServerMode;
var LOGGERS = {};
var SLAVE_REMOTE = null;
var MASTER_SERVER = null;

var bus = require("hermes-bus");
var Utils = require("./utils.js");
var Logia = require("./logia.js");
var ActiveLoggerNameLengthHandler = require("./active-name-length-handler.js");
var extend = require("extend");
var ModeHandlerListener = require("./mode-handler-listener.js");

/**
* The Logia module. The returned value of require("logia").
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
            ConfigFileHandler.writeConfigurationFile(RUNTIME_CONFIG);
        }
    } else {
        console.warn("[LOGIA] overwriteConfigFile function is a NOOP in the browser");
    }
};

/**
* Sets the date format in the logs.
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
* Enters slave mode. Logia configuration is dictated by the specified Logia master node.
* @param {object} options Logia master server location info.
* @param {string} options.host
* @param {number} options.port
* @memberof Logia
*/
LogiaFactory.enterSlaveMode = function(options) {
    LogiaFactory.exitSlaveMode();
    var url = options.host + ":" + options.port;
    SLAVE_REMOTE = Utils.createRemote({protocol: "ws", url: url, tag: "slave"});
    bus[EVENT_BUSLINE].trigger("enableMasterSlaveMode", {type: "slave", url: url});
    SLAVE_REMOTE.onWsMessage(function(masterConfig){
        LogiaFactory.config(masterConfig);
    });
};

/**
* Exits slave mode. Logia configuration is based on local configuration file again.
* @memberof Logia
*/
LogiaFactory.exitSlaveMode = function() {
    if(SLAVE_REMOTE){
        SLAVE_REMOTE.terminate();
        SLAVE_REMOTE = null;
        bus[EVENT_BUSLINE].trigger("disableMasterSlaveMode", {type: "slave"});
    }
};

/**
* Enters master mode. A master Logia node can command multiple slave nodes through via the master node configuration mechanism.
* @param {object} options Logia master server info.
* @param {string} options.host.
* @param {number} options.port.
* @memberof Logia
*/
LogiaFactory.enterMasterMode = function(options) {
    if(IN_SERVER_MODE){
        var url = options.host + ":" + options.port;
        MASTER_SERVER = Utils.setupMasterServer(MASTER_SERVER, options);
        bus[EVENT_BUSLINE].trigger("enableMasterSlaveMode", {type: "master", url: url});
    } else {
        console.warn("[LOGIA] enterMasterMode function is a NOOP in the browser");
    }
};

/**
* Exits master mode.
* @memberof Logia
*/
LogiaFactory.exitMasterMode = function() {
    if(IN_SERVER_MODE){
        if(MASTER_SERVER){
            MASTER_SERVER.stop();
            MASTER_SERVER = null;
            bus[EVENT_BUSLINE].trigger("disableMasterSlaveMode", {type: "master"});
        }
    } else {
        console.warn("[LOGIA] exitMasterMode function is a NOOP in the browser");
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

// Attaching listener on the bus
bus.subscribe(EVENT_BUSLINE, ModeHandlerListener);

bus.subscribe(EVENT_BUSLINE, {
    afterConfigurationChanged: function () {
        // setDateFormat ensures validity of dateFormat value
        LogiaFactory.setDateFormat(RUNTIME_CONFIG.dateFormat);
    }
});

var hasModeConfigChanged = function(){
    var hasChanged = true;
    var url = RUNTIME_CONFIG.mode && RUNTIME_CONFIG.mode.host + ":" + RUNTIME_CONFIG.mode.port;
    if(SLAVE_REMOTE){
        hasChanged = RUNTIME_CONFIG.mode.type !== "slave" || url !== SLAVE_REMOTE.options.url;
    } else if(MASTER_SERVER){
        hasChanged = RUNTIME_CONFIG.mode.type !== "master" || url !== MASTER_SERVER.url;
    }
    return hasChanged;
};

var setupMasterSlaveMode = function() {
    if(hasModeConfigChanged()){
        LogiaFactory.exitMasterMode();
        LogiaFactory.exitSlaveMode();
        if(RUNTIME_CONFIG.mode){
            if(RUNTIME_CONFIG.mode.type === "master"){
                LogiaFactory.enterMasterMode(RUNTIME_CONFIG.mode);
            } else if(RUNTIME_CONFIG.mode.type === "slave"){
                LogiaFactory.enterSlaveMode(RUNTIME_CONFIG.mode);
            }
        }
    }
};

if(IN_SERVER_MODE){
    var ConfigFileHandler = require("./configuration-file-handler.js");
    setupMasterSlaveMode();

    // Attaching listener on the bus
    var FileTrimmerListener = require("./file-trimmer-listener.js");
    bus.subscribe(EVENT_BUSLINE, FileTrimmerListener);

    bus.subscribe(EVENT_BUSLINE, {
        afterConfigurationChanged: function () {
            setupMasterSlaveMode();
        }
    });
}

module.exports = LogiaFactory;
