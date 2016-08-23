var request = require("request");
var colors = require("colors");
var _ = require("underscore");
var WS = typeof window === "undefined" ? require("ws") : WebSocket;
var MESSAGE_CACHE_SIZE = 500;

var HermesLogRemote = function (options) {
    var hermesLogRemote = this;
    hermesLogRemote.messageCache = [];

    hermesLogRemote.options = options;
    var protocol = options.protocol;
    if (protocol === "ws") {
        hermesLogRemote.initWsConnection();
    } else if(protocol === "http"){
        if(!/^http/.test(hermesLogRemote.options.url)){
            hermesLogRemote.options.url = "http://" + hermesLogRemote.options.url;
        }
    } else {
        var UNKNOWN_PROTOCOL_MSG = "****** Unsupported remote protocol: " + protocol;
        console.error(UNKNOWN_PROTOCOL_MSG.red);
        return {};
    }
};

var wsAttemptedConnections = [];
process.on("uncaughtException", function(error) {
    if(error.code === "ECONNRESET"){
        wsAttemptedConnections.forEach(function(hermesLogRemote){
            hermesLogRemote.retryWsConnection();
        });
        wsAttemptedConnections = [];
        console.error("Uncaught Websocket exception: " + error);
    }
});

HermesLogRemote.prototype.initWsConnection = function () {
    var hermesLogRemote = this;
    wsAttemptedConnections.push(hermesLogRemote);
    try {
        var url = hermesLogRemote.options.url;
        hermesLogRemote.ws = new WS("ws://" + url);
        hermesLogRemote.ws.onopen = function () {
            wsAttemptedConnections = _.without(wsAttemptedConnections, hermesLogRemote);
            hermesLogRemote.messageCache.forEach(function (msg) {
                hermesLogRemote.ws.send(msg);
            });
            hermesLogRemote.messageCache = [];
        };

        hermesLogRemote.ws.onclose = function () {
            wsAttemptedConnections = _.without(wsAttemptedConnections, hermesLogRemote);
            hermesLogRemote.retryWsConnection();
            console.log("closing web-socket connection");
        }
    } catch(e) {
        console.error("****** Could not connect to location:", url);
    }
};

HermesLogRemote.prototype.retryWsConnection = function () {
    var hermesLogRemote = this;
    setTimeout(hermesLogRemote.initWsConnection.bind(hermesLogRemote), 5000);
};

HermesLogRemote.prototype.cacheMessage = function (msg) {
    var hermesLogRemote = this;
    var messageCache = hermesLogRemote.messageCache;
    if(messageCache.length > MESSAGE_CACHE_SIZE){
        messageCache = messageCache.splice(MESSAGE_CACHE_SIZE / 2);
    }
    messageCache.push(msg)
};

HermesLogRemote.prototype.log = function (msg) {
    var hermesLogRemote = this;
    var protocol = hermesLogRemote.options.protocol;
    var url = hermesLogRemote.options.url;
    var ws = hermesLogRemote.ws;
    if (url) {
        switch (protocol) {
            case "ws":
                    ws.readyState === 1
                        ? hermesLogRemote.ws.send(msg)
                        : hermesLogRemote.cacheMessage(msg);
                break;
            case "http":
            hermesLogRemote.post(msg);
            break;
            default:
            console.log("Unknown remote connection protocol:", protocol)
            break;
        }
    } else {
        console.log("destination URL is not defined");
    }
};

HermesLogRemote.prototype.post = function (msg) {
    var hermesLogRemote = this;

    request.post({
        url: hermesLogRemote.options.url,
        form: {logMsg: msg}
    },
    function (error, response, body) {
        if (error) {
            console.error(error);
        }
    });
};

module.exports = HermesLogRemote;
