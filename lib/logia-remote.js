/**
* curtainjs <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var request = require("request");
var colors = require("colors");
var WS = typeof window === "undefined" ? require("ws") : WebSocket;
var MESSAGE_CACHE_SIZE = 500;

var LogiaRemote = function (options) {
    var loggerRemote = this;
    loggerRemote.messageCache = [];

    loggerRemote.options = options;
    var protocol = options.protocol;
    var url = loggerRemote.options.url;
    if(url){
        if (protocol === "ws") {
            loggerRemote.initWsConnection();
        } else if(protocol === "http"){
            if(!/^http/.test(loggerRemote.options.url)){
                loggerRemote.options.url = "http://" + loggerRemote.options.url;
            }
        } else {
            throw new Error("[LOGIA] Unsupported remote protocol: " + protocol);
        }
    } else {
        throw new Error("[LOGIA] Undefined remote URL");
    }
};

var wsAttemptedConnections = [];
process.on("uncaughtException", function(error) {
    if(error.code === "ECONNRESET" || error.code === "ENOTFOUND"){
        wsAttemptedConnections.forEach(function(loggerRemote){
            loggerRemote.retryWsConnection();
        });
        wsAttemptedConnections = [];
        console.error(("[LOGIA] Uncaught Websocket exception: " + error.message).red);
    } else {
        console.log(error);
    }
});

LogiaRemote.prototype.initWsConnection = function () {
    var loggerRemote = this;
    wsAttemptedConnections.push(loggerRemote);
    try {
        var url = loggerRemote.options.url;
        loggerRemote.ws = new WS("ws://" + url);
        loggerRemote.ws.onopen = function () {
            wsAttemptedConnections = wsAttemptedConnections.filter(function(ref){
                return ref !== loggerRemote;
            });
            loggerRemote.messageCache.forEach(function (msg) {
                loggerRemote.ws.send(msg);
            });
            loggerRemote.messageCache = [];
        };

        loggerRemote.ws.onclose = function () {
            wsAttemptedConnections = wsAttemptedConnections.filter(function(ref){
                return ref !== loggerRemote;
            });
            loggerRemote.retryWsConnection();
        }
    } catch(e) {
        console.error("[LOGIA] Could not connect to location:", url);
    }
};

LogiaRemote.prototype.retryWsConnection = function () {
    var loggerRemote = this;
    setTimeout(loggerRemote.initWsConnection.bind(loggerRemote), 5000);
};

LogiaRemote.prototype.cacheMessage = function (msg) {
    var loggerRemote = this;
    var messageCache = loggerRemote.messageCache;
    if(messageCache.length > MESSAGE_CACHE_SIZE){
        messageCache = messageCache.splice(MESSAGE_CACHE_SIZE / 2);
    }
    messageCache.push(msg)
};

LogiaRemote.prototype.log = function (msg) {
    var loggerRemote = this;
    var protocol = loggerRemote.options.protocol;
    var url = loggerRemote.options.url;
    var ws = loggerRemote.ws;
    switch (protocol) {
        case "ws":
                ws.readyState === 1
                    ? loggerRemote.ws.send(msg)
                    : loggerRemote.cacheMessage(msg);
            break;
        case "http":
                loggerRemote.post(msg);
            break;
        default:
                console.error(("[LOGIA] Unsupported remote protocol: " + protocol).red)
            break;
    }
};

LogiaRemote.prototype.post = function (msg) {
    var loggerRemote = this;

    request.post({
        url: loggerRemote.options.url,
        form: {logMsg: msg}
    },
    function (error, response, body) {
        if (error) {
            console.error(error);
        }
    });
};

module.exports = LogiaRemote;
