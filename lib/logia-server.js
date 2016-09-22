/**
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var bus = require("hermes-bus");
var ws = require("ws");
var WebSocketServer = require("ws").Server;
var CircularJSON = require("circular-json");

var LogiaServer = function(config, buslineId){
    var logiaServer = this;
    logiaServer.host = config.server.interface;
    logiaServer.port = config.server.port;
    logiaServer.server = new WebSocketServer({host: logiaServer.host, port: logiaServer.port});
    logiaServer.config = config;
    logiaServer.buslineId = buslineId;
    logiaServer.numOfSlaves = 0;
};

LogiaServer.prototype.start = function (){
    var logiaServer = this;
    logiaServer.server.on("connection", function (wsConnection) {
        var isSlaveClient = wsConnection.protocol === "slave";
        if(isSlaveClient){
            logiaServer.numOfSlaves++;
            bus[logiaServer.buslineId].trigger("enableFullstackMode");

            logiaServer.onConfigurationChangedListener =  {
                afterConfigurationChanged: function(){
                    wsConnection.send(CircularJSON.stringify(logiaServer.config));
                }
            };

            wsConnection.on("close", function(message) {
                bus.unsubscribe(logiaServer.buslineId, logiaServer.onConfigurationChangedListener);

                logiaServer.numOfSlaves--;
                if(!logiaServer.isInFullstackMode()){
                    bus[logiaServer.buslineId].trigger("disableFullstackMode");
                }
            });

            bus.subscribe(logiaServer.buslineId, logiaServer.onConfigurationChangedListener);
            wsConnection.send(CircularJSON.stringify(logiaServer.config));
        }

        wsConnection.on("message", function(logJSON) {
            try {
                var logObj = JSON.parse(logJSON);
                if(logiaServer.isInFullstackMode()){
                    bus[logiaServer.buslineId].triggerFullstackModeLog(logiaServer.config, logObj);
                }
                bus[logiaServer.buslineId].trigger("remoteLogReceived", logObj)
            } catch(error){
                console.log("[LOGIA] Server error", error);
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
