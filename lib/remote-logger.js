var server = require("http").createServer();
var io = require("socket.io")(server);
var request = require("request");

var RemoteLogger = function (options) {
	var self = this;
	self.options = options;
};

RemoteLogger.prototype.send = function (msg) {
	var self = this;
	if (self.options.url) {
		switch (self.options.type) {
			case "socket":
				break;
			case "httpPost":
				self.post(msg);
				break;
			default:
				break;
		}
	} else {
		console.log("destination URL is not defined");
	}
};

RemoteLogger.prototype.bootSocket = function () {
//	io.on('connection', function (socket) {
//		socket.on('event', function (data) {
//		});
//		socket.on('disconnect', function () {
//		});
//	});
//	server.listen(3000);
};

RemoteLogger.prototype.post = function (msg) {
	var self = this;
	request.post({
			url :self.options.url,
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

