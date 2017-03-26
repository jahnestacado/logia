/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var bus = require("hermes-bus");
var ws = require("ws");
var WebSocketServer = require("ws").Server;
var CircularJSON = require("circular-json");
var Utils = require("./logia-utils.js");
var extend = require("extend");
var Config = require("./logia-config.js");
var RUNTIME_CONFIG = Config.runtime;
var EVENT_BUSLINE = Config.static.eventBusline;

var LogiaServer = function(options){
    var logiaServer = this;
    logiaServer.url = options.host + ":" + options.port;
    logiaServer.server = new WebSocketServer({host: options.host, port: options.port});
    logiaServer.config = RUNTIME_CONFIG;
    logiaServer.numOfSlaves = 0;
    console.log("Starting server at ", logiaServer.url);
};

LogiaServer.prototype.start = function (){
    var logiaServer = this;
    logiaServer.server.on("connection", function (wsConnection) {
        var isSlaveClient = wsConnection.protocol === "slave";
        if(isSlaveClient){
            logiaServer.onConfigurationChangedListener =  {
                afterConfigurationChanged: function(){
                    var slaveConfig = extend({}, logiaServer.config, {mode: null});
                    wsConnection.send(CircularJSON.stringify(slaveConfig));
                }
            };

            wsConnection.on("close", function(message) {
                bus.unsubscribe(EVENT_BUSLINE, logiaServer.onConfigurationChangedListener);
            });

            bus.subscribe(EVENT_BUSLINE, logiaServer.onConfigurationChangedListener);
            wsConnection.send(CircularJSON.stringify(logiaServer.config));
        }

        wsConnection.on("message", function(logJSON) {
            try {
                var logObj = JSON.parse(logJSON);
                logObj.logMessage = Utils.createLogMessage(logObj);
                logiaServer.config.stdout && bus[EVENT_BUSLINE].triggerStdoutLog(logObj.logMessage.color());
                var logger = require("./logia-factory.js")(logObj.name)
                bus[EVENT_BUSLINE].triggerAppendersLog(logger, logObj);
                bus[EVENT_BUSLINE].triggerRemoteLogReceived && bus[EVENT_BUSLINE].trigger("remoteLogReceived", logObj);
            } catch(error){
                console.log("[LOGIA] Server error", error.message);
            }
        });

    });

    return logiaServer;
};

LogiaServer.prototype.stop = function (onStop){
    var logiaServer = this;
    logiaServer.server.close(onStop)
};

module.exports = LogiaServer;
