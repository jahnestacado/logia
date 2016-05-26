var request = require("request");
var colors = require("colors");
var WS = typeof window === "undefined" ? require("ws") : WebSocket;
var beforeConnectionBuffer = [];

var HermesLogRemote = function (options) {
    var hermesLogRemote = this;

    hermesLogRemote.options = options;
    var type = options.type;
    if (type === "ws") {
        hermesLogRemote.initWsConnection();
    } else if(type === "http"){
        if(!/^http/.test(hermesLogRemote.options.url)){
            hermesLogRemote.options.url = "http://" + hermesLogRemote.options.url;
        }
    } else {
        var UNKNOWN_PROTOCOL_MSG = "****** Unsupported remote protocol: " + type;
        console.error(UNKNOWN_PROTOCOL_MSG.red);
        return {};
    }
};

HermesLogRemote.prototype.initWsConnection = function () {
    var hermesLogRemote = this;

    var url = hermesLogRemote.options.url;
    try {
        hermesLogRemote.ws = new WS("ws://" + url);
        hermesLogRemote.ws.onopen = function () {
            beforeConnectionBuffer.length && beforeConnectionBuffer.forEach(function (msg) {
                hermesLogRemote.ws.send(msg);
            });
            beforeConnectionBuffer = [];
        };
    } catch(e) {
        console.error("****** Could not connect to location:", url);
    }
};

HermesLogRemote.prototype.log = function (msg) {
    var hermesLogRemote = this;
    var type = hermesLogRemote.options.type;
    var url = hermesLogRemote.options.url;
    var ws = hermesLogRemote.ws;
    if (url) {
        switch (type) {
            case "ws":
            ws.readyState === 1 ? hermesLogRemote.ws.send(msg) : beforeConnectionBuffer.push(msg);
            break;
            case "http":
            hermesLogRemote.post(msg);
            break;
            default:
            console.log("Unknown remote connection type:", type)
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
