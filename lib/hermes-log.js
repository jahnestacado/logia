var bus = require("hermes-bus");
var moment = require("moment");
var fs = require("fs");
var extend = require("extend");
var CONFIG_FILE_PATH = "config/hermes-log.json";
var EOL = require('os').EOL;

var LEVELS = [
	"emergency",
	"alert",
	"critical",
	"error",
	"warn",
	"notice",
	"info",
	"debug"
];

var config = {
	logLevel: {
		"emergency": false,
		"alert": false,
		"critical": false,
		"error": false,
		"alert": false,
		"warn": false,
		"notice": false,
		"info": false,
		"debug": false
	},
	stdout: true,
	destFile: "",
	dateFormat: "MMM DD, YYYY / hh:mm A",
};

var HermesLog = function () {
	var self = this;

	self.constructApi();
	self.configInit();
	self.subscribeEventListeners();
};

HermesLog.prototype.constructApi = function () {
	var self = this;

	LEVELS.forEach(function (level) {
		self[level] = function () {
			if (config.logLevel[level]) {
				//Convert arguments to pure array object
				var args = Array.prototype.slice.call(arguments);
				// Assign log message to msg variable and remove it from the args array
				var msg = args.shift();
				bus.triggerLogEvent({
					message: msg,
					params: args,
					level: level
				});
			}
		};
	});
};

HermesLog.prototype.configInit = function () {
	var self = this;

	if (fs.existsSync(CONFIG_FILE_PATH)) {
		self.loadConfiguration();
		fs.watchFile(CONFIG_FILE_PATH, function () {
			bus.triggerConfigurationChanged();
		});
	} else {
		//Warn user that file doesnt exists
	}
};

HermesLog.prototype.loadConfiguration = function loadConfiguration() {
	config = extend(config, JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, "utf8")));
};

HermesLog.prototype.subscribeEventListeners = function () {
	var self = this;

	bus.subscribe({
		onLogEvent: function (logObject) {
			var formattedLogMsg = self.constructLogMessageHeader(logObject) + ": " + self.getParameterizedMessage(logObject);
			if (config.stdout) {
				console.log(formattedLogMsg);
			}

			if (config.destFile) {
				self.logToFile(formattedLogMsg, config.destFile);
			}
		},
		onConfigurationChanged: function () {
			var oldDestFile = config.destFile;
			self.loadConfiguration();

			if (oldDestFile !== config.destFile) {
				self.setupLogFile(config.destFile);
			}
		}
	});
};

HermesLog.prototype.logToFile = function (msg, destPath) {
	fs.appendFile(destPath, msg + EOL, function (error) {
		if (error) {
			console.log(error);
		}
	});
};

HermesLog.prototype.setupLogFile = function (filepath) {
	fs.exists(filepath, function (exists) {
		if (!exists) {
			fs.writeFile(filepath, "", function (error) {
				if (error) {
					return console.log(error);
				}
			});
		}
	});
};

HermesLog.prototype.constructLogMessageHeader = function  constructLogMessageHeader(logObject) {
	return "(" + moment().format(config.dateFormat) + ")[" + logObject.level.toUpperCase() + "]";
};

HermesLog.prototype.getParameterizedMessage = function getParameterizedMessage(logObject) {
	var parameterizedMsg = logObject.message;
	var convertTagToIndex = function (parameterTag) {
		return parameterTag.replace(/({|})/g, "");
	};

	var parameterTags = logObject.message.match(/{(\d)+}/g);
	if (parameterTags.length && logObject.params) {
		parameterTags.forEach(function (tag) {
			var parameterValue = logObject.params[convertTagToIndex(tag)];
			parameterizedMsg = parameterizedMsg.replace(tag, parameterValue);
		});
	}

	return parameterizedMsg;
};

HermesLog.prototype.setConf = function (options) {
	config = extend(config, options);
	fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, 2), function (error) {
		if (error) {
			return console.log(error);
		}
	});
};

module.exports = new HermesLog();

