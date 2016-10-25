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

var LogiaServer = function(config, eventBusline){
    var logiaServer = this;
    logiaServer.host = config.server.interface;
    logiaServer.port = config.server.port;
    logiaServer.url = logiaServer.host + ":" + logiaServer.port;
    logiaServer.server = new WebSocketServer({host: logiaServer.host, port: logiaServer.port});
    logiaServer.config = config;
    logiaServer.eventBusline = eventBusline;
    logiaServer.numOfSlaves = 0;
};

LogiaServer.prototype.start = function (){
    var logiaServer = this;
    logiaServer.server.on("connection", function (wsConnection) {
        var isSlaveClient = wsConnection.protocol === "slave";
        if(isSlaveClient){
            logiaServer.numOfSlaves++;

            logiaServer.onConfigurationChangedListener =  {
                afterConfigurationChanged: function(){
                    wsConnection.send(CircularJSON.stringify(logiaServer.config));
                }
            };

            wsConnection.on("close", function(message) {
                bus.unsubscribe(logiaServer.eventBusline, logiaServer.onConfigurationChangedListener);

                logiaServer.numOfSlaves--;
                if(!logiaServer.isInFullstackMode()){
                    bus[logiaServer.eventBusline].trigger("disableFullstackMode");
                }
            });

            bus[logiaServer.eventBusline].trigger("enableFullstackMode", logiaServer.url);
            bus.subscribe(logiaServer.eventBusline, logiaServer.onConfigurationChangedListener);
            wsConnection.send(CircularJSON.stringify(logiaServer.config));
        }

        wsConnection.on("message", function(logJSON) {
            try {
                var logObj = JSON.parse(logJSON);
                if(logiaServer.isInFullstackMode()){
                    logObj.logMessage = Utils.createLogMessage(logObj);
                    logiaServer.config.stdout && bus[logiaServer.eventBusline].triggerFullstackStdoutLog(logObj.logMessage.color());
                    bus[logiaServer.eventBusline].triggerFullstackAppendersLog(logObj);
                }
                bus[logiaServer.eventBusline].trigger("remoteLogReceived", logObj)
            } catch(error){
                console.log("[LOGIA] Server error", error.message);
            }
        });

    });

    return logiaServer;
};

LogiaServer.prototype.stop = function (onStop){
    var logiaServer = this;

    logiaServer.server.close(function(){
        onStop();
    })
};

LogiaServer.prototype.isInFullstackMode = function (onStop){
    var logiaServer = this;
    return logiaServer.numOfSlaves > 0;
};

module.exports = LogiaServer;
