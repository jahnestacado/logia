var config = {
	logLevel: "trace",
	stdout: true,
	destFile: "",
	dateFormat: "MMM DD, YYYY / hh:mm A",
	remote: {
		type: "httpPost",
		url : "http://localhost:5555/log"
	}
};

var LEVELS = {
	fatal: {
		tag: "fatal",
		color: "red"
	},
	error: {
		tag: "error",
		color: "red"
	},
	warn: {
		tag: "warn",
		color: "yellow"
	},
	info: {
		tag: "info",
		color: "green"
	},
	debug: {
		tag: "debug",
		color: "green"
	},
	trace: {
		tag: "trace",
		color: "green"
	}
};

var bus = require("hermes-bus");
var moment = require("moment");
var fs = require("fs");
var colors = require("colors");
var extend = require("extend");
var CONFIG_FILE_PATH = "config/hermes-log.json";
var remoteLogger = require("./remote-logger.js")(config.remote);
var EOL = require('os').EOL;
var activeLevels;

var HermesLog = function () {
	var HermesLog = this;

	HermesLog.constructApi();
	HermesLog.configInit();
	HermesLog.subscribeEventListeners();
};

HermesLog.prototype.constructApi = function () {
	var HermesLog = this;

	Object.keys(LEVELS).forEach(function (key) {
		var level = LEVELS[key].tag;

		HermesLog[level] = function () {
			if (activeLevels.indexOf(config.logLevel) !== -1) {
				//Convert arguments to pure array object
				var args = Array.prototype.slice.call(arguments);
				// Assign log message to msg variable and remove it from the args array
				var msg = args.shift();
				var params = args;
				bus.triggerLogEvent({
					message: msg,
					params: params,
					level: level
				});
			}
		};
	});
};

HermesLog.prototype.getActiveLevels = function(level){
	var activeLevels = [];

	switch (level) {
		case "trace" :
			activeLevels.push(LEVELS.trace.tag)
		case"debug":
			activeLevels.push(LEVELS.debug.tag);
		case "info":
			activeLevels.push(LEVELS.info.tag);
		case"warn":
			activeLevels.push(LEVELS.warn.tag);
		case "error":
			activeLevels.push(LEVELS.error.tag);
		case "fatal":
			activeLevels.push(LEVELS.fatal.tag);
	}

	return activeLevels;
};

HermesLog.prototype.configInit = function () {
	var HermesLog = this;

	var loadAndWatchConfFile = function(){
		HermesLog.loadConfiguration();

		fs.watchFile(CONFIG_FILE_PATH, function () {
			bus.triggerConfigurationChanged();
		});
	};

	if (!fs.existsSync(CONFIG_FILE_PATH)) {
		console.log("****** Hermes-bus configuration file does not exist!\n****** creating default config file: " + CONFIG_FILE_PATH + "...");
		fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2) ,"utf8");
		console.log("******", CONFIG_FILE_PATH + " file is created!");
	}

	loadAndWatchConfFile();
};

HermesLog.prototype.loadConfiguration = function loadConfiguration() {
	var HermesLog = this;
	var fileConf = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, "utf8"));
	config = extend(config, fileConf);
	// Update activeLevels everytime we load configuration
	activeLevels = HermesLog.getActiveLevels(config.logLevel);
};

HermesLog.prototype.subscribeEventListeners = function () {
	var HermesLog = this;

	bus.subscribe({
		onLogEvent: function (logObject) {
			var formattedLogMsg = HermesLog.constructLogMessageHeader(logObject) + ": " + HermesLog.getParameterizedMessage(logObject);
			
			if (config.stdout) {
				console.log(formattedLogMsg[LEVELS[logObject.level].color]);
			}

			if (config.destFile) {
				HermesLog.logToFile(formattedLogMsg, config.destFile);
			}

			if(config.remote){
				remoteLogger.send(formattedLogMsg);
			}
		},
		onConfigurationChanged: function () {
			var oldDestFile = config.destFile;
			HermesLog.loadConfiguration();

			if (oldDestFile !== config.destFile) {
				HermesLog.setupLogFile(config.destFile);
			}
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

	if (parameterTags && logObject.params) {
		parameterTags.forEach(function (tag) {
			var parameterValue = logObject.params[convertTagToIndex(tag)];
			parameterizedMsg = parameterizedMsg.replace(tag, parameterValue);
		});
	}

	return parameterizedMsg;
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

HermesLog.prototype.setConf = function (options) {
	config = extend(config, options);
	fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), function (error) {
		if (error) {
			return console.log(error);
		}
	});
};

module.exports = new HermesLog();

