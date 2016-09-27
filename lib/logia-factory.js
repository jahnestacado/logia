var GLOBAL_CONFIG = require("./logia-init-config.js");
var LOGGERS = {};
var bus = require("hermes-bus");
var LogiaUtils = require("./logia-utils.js");
var BUSLINE_ID = "__LOGIA__";
var Logia = require("./logia.js");
var LogiaModeHandler = require("./logia-mode-handler.js")(BUSLINE_ID);
var extend = require("extend");
var IN_SERVER_MODE = typeof window === "undefined" ? true : false;

bus.subscribe(BUSLINE_ID, {
    afterConfigurationChanged: function () {
        // setDateFormat ensures validity of dateFormat value
        LogiaFactory.setDateFormat(GLOBAL_CONFIG.dateFormat);
    }
});

if(IN_SERVER_MODE){
    var ConfigFileHandler = require("./logia-configuration-file-handler.js");
    var configFileHandler = new ConfigFileHandler(GLOBAL_CONFIG, BUSLINE_ID);

    var LogServer = LogiaUtils.setupLogServer(null, GLOBAL_CONFIG, BUSLINE_ID);
    var LogFileTrimmer = require("./logia-file-trimmer.js");
    var LogFileTrimmer = new LogFileTrimmer(BUSLINE_ID);

    bus.subscribe(BUSLINE_ID, {
        afterConfigurationChanged: function () {
            LogServer = LogiaUtils.setupLogServer(LogServer, GLOBAL_CONFIG, BUSLINE_ID);
        }
    });
}

var LogiaFactory = function(name) {
    var logger;
    if(LOGGERS[name]){
        logger = LOGGERS[name];
    } else {
        logger = new Logia(name);
        LOGGERS[name] = logger;
    }
    return logger;
};

LogiaFactory.overwriteConfigFile = function(config) {
    if(IN_SERVER_MODE){
        if(GLOBAL_CONFIG.overwritable){
            extend(GLOBAL_CONFIG, config);
            configFileHandler.writeConfigurationFile(GLOBAL_CONFIG);
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
    GLOBAL_CONFIG.dateFormat = newDateFormat;
};

LogiaFactory.config = function(config) {
        extend(GLOBAL_CONFIG, config);
        bus[BUSLINE_ID] && bus[BUSLINE_ID].trigger("configurationChanged");
};

LogiaFactory.slaveOf = function(targetUrl) {
    // @TODO Browser only
    var slaveRemote = LogiaUtils.createRemote({protocol: "ws", url: targetUrl, tag: "slave"});
    bus[BUSLINE_ID].trigger("enableFullstackMode", targetUrl);
    slaveRemote.onWsMessage(function(config){
        LogiaFactory.config(config);
    });
};


LogiaFactory.server = {
    // @TODO Server only
    on: function(event, listener){
        switch (event) {
            case "log":
                bus.subscribe(BUSLINE_ID, {
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
