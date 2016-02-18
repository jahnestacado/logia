var request = require("request");
var WS = typeof window === "undefined" ? require("ws") : WebSocket;
var beforeConnectionBuffer = [];

var RemoteLogger = function (options) {
	var remoteLogger = this;
	remoteLogger.options = options;

	if (remoteLogger.options.type === "ws") {
		remoteLogger.initWsConnection();
	}
};

RemoteLogger.prototype.initWsConnection = function () {
	var remoteLogger = this;
	var url = remoteLogger.options.url;
	try {
		remoteLogger.ws = new WS("ws://" + url);
	} catch (e) {
		console.log("****** Could connect to remote server:", url);
	}

	remoteLogger.ws.onopen = function () {
		beforeConnectionBuffer.length && beforeConnectionBuffer.forEach(function (msg) {
			remoteLogger.ws.send(msg);
		});
		beforeConnectionBuffer = [];
	};
};

RemoteLogger.prototype.send = function (msg) {
	var remoteLogger = this;
	var type = remoteLogger.options.type;
	var url = remoteLogger.options.url;
	var ws = remoteLogger.ws;

	if (url) {
		switch (type) {
			case "ws":
				ws.readyState === 1 ? remoteLogger.ws.send(msg) : beforeConnectionBuffer.push(msg);
				break;
			case "httpPost":
				remoteLogger.post(msg);
				break;
			default:
				console.log("Unknown remote connection type:", type)
				break;
		}
	} else {
		console.log("destination URL is not defined");
	}
};

RemoteLogger.prototype.post = function (msg) {
	var remoteLogger = this;
	request.post({
		url: remoteLogger.options.url,
		form: {logMsg: msg}
	},
	function (error, response, body) {
//			if (!error && response.statusCode == 200) {
//				return console.log(error);
//			}
	}
	);
};

var initializer = function (options) {
	return new RemoteLogger(options);
};

module.exports = initializer;

