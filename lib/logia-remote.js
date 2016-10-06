/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var request = require("request");
var colors = require("colors");
var Config = require("./logia-config.js");
var WS = Config.static.inServerMode ? require("ws") : WebSocket;
var CircularJSON = require("circular-json");
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

LogiaRemote.prototype.initWsConnection = function () {
    var loggerRemote = this;
    try {
        var url = loggerRemote.options.url;
        loggerRemote.ws = new WS("ws://" + url, loggerRemote.options.tag);
        loggerRemote.ws.onopen = function () {
            loggerRemote.messageCache.forEach(function (msg) {
                loggerRemote.ws.send(msg);
            });
            loggerRemote.messageCache = [];

            loggerRemote.ws.onmessage = function(msg){
                if(loggerRemote.onWsMessageCallbackRegistry){
                    loggerRemote.onWsMessageCallbackRegistry.forEach(function(onMsgCallback){
                        onMsgCallback(JSON.parse(msg.data));
                    });
                }
            };

            loggerRemote.ws.onclose = function () {
                loggerRemote.retryWsConnection();
                if(loggerRemote.onWsCloseCallbackRegistry){
                    loggerRemote.onWsCloseCallbackRegistry.forEach(function(onCloseCallback){
                        onCloseCallback() ;
                    });
                }
            }
        };

        loggerRemote.ws.onerror = function (error) {
                loggerRemote.retryWsConnection();
                console.error(("[LOGIA] Websocket exception: " + error).red);
        }

    } catch(error) {
        console.error("[LOGIA] Could not connect to location:", url);
    }
};

LogiaRemote.prototype.terminate = function(){
    var loggerRemote = this;

    loggerRemote.retryWsConnection = function(){};
    loggerRemote.ws.terminate && loggerRemote.ws.terminate();
    loggerRemote.ws.close && loggerRemote.ws.close();
}

LogiaRemote.prototype.onWsMessage = function (onMsgCallback) {
    var loggerRemote = this;
    loggerRemote.onWsMessageCallbackRegistry =  loggerRemote.onWsMessageCallbackRegistry
                                                ? loggerRemote.onWsMessageCallbackRegistry.push(onMsgCallback)
                                                : [onMsgCallback];
}

LogiaRemote.prototype.onWsClose = function (onCloseCallback) {
    var loggerRemote = this;
    loggerRemote.onWsCloseCallbackRegistry =  loggerRemote.onWsCloseCallbackRegistry
                                                ? loggerRemote.onWsCloseCallbackRegistry.push(onCloseCallback)
                                                : [onCloseCallback];
}

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

LogiaRemote.prototype.log = function (logObj) {
    var loggerRemote = this;
    var protocol = loggerRemote.options.protocol;
    var ws = loggerRemote.ws;
    var logJSON = CircularJSON.stringify(logObj);
    switch (protocol) {
        case "ws":
                ws.readyState === 1
                    ? loggerRemote.ws.send(logJSON)
                    : loggerRemote.cacheMessage(logJSON);
            break;
        case "http":
                loggerRemote.post(logJSON);
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
