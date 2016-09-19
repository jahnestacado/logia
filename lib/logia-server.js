var bus = require("hermes-bus");
var ws = require("ws");

var WebSocketServer = require("ws").Server;
var CircularJSON = require("circular-json");

var LogiaServer = function(config, buslineId, onMessageListeners){
    var logiaServer = this;
    logiaServer.host = config.server.interface;
    logiaServer.port = config.server.port;
    logiaServer.server = new WebSocketServer({host: logiaServer.host, port: logiaServer.port});
    logiaServer.config = config;
    logiaServer.onMessageListeners = onMessageListeners;
    logiaServer.buslineId = buslineId;
};

LogiaServer.prototype.start = function (){
    var logiaServer = this;
    logiaServer.server.on("connection", function (wsConnection) {
        var isSlaveClient = wsConnection.protocol === "slave";
        if(isSlaveClient){
            logiaServer.onConfigurationChangedListener =  {
                afterConfigurationChanged: function(){
                    wsConnection.send(CircularJSON.stringify(logiaServer.config));
                }
            };

            wsConnection.on("close", function(message) {
                bus.unsubscribe(logiaServer.buslineId, logiaServer.onConfigurationChangedListener);
            });

            bus.subscribe(logiaServer.buslineId, logiaServer.onConfigurationChangedListener);
            wsConnection.send(CircularJSON.stringify(logiaServer.config));
        }

        wsConnection.on("message", function(message) {
            logiaServer.onMessageListeners.forEach(function(listener){
                listener(message);
            });
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

module.exports = LogiaServer;
