var request = require("request");
var WS = typeof window === "undefined" ? require("ws") : WebSocket;
var beforeConnectionBuffer = [];

var HermesLogRemote = function (options) {
    var hermesLogRemote = this;

    hermesLogRemote.options = options;
    if (hermesLogRemote.options.type === "ws") {
        hermesLogRemote.initWsConnection();
    }
};

HermesLogRemote.prototype.initWsConnection = function () {
    var hermesLogRemote = this;

    var url = hermesLogRemote.options.url;
    try {
        hermesLogRemote.ws = new WS("ws://" + url);
    } catch (e) {
        console.log("****** Could not connect to location:", url);
    }

    hermesLogRemote.ws.onopen = function () {
        beforeConnectionBuffer.length && beforeConnectionBuffer.forEach(function (msg) {
            hermesLogRemote.ws.send(msg);
        });
        beforeConnectionBuffer = [];
    };
};

HermesLogRemote.prototype.send = function (msg) {
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
        if (!error && response.statusCode == 200) {
            return console.log(error);
        }
    });
};

module.exports = HermesLogRemote;
