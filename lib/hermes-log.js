var config = {
	logLevel: null,
	stdout: true,
	destFile: null,
	dateFormat: "MMM DD, YYYY / hh:mm A",
	remote: null  // {type: "ws"|"http", url: ...}
};

var LEVELS = {
	fatal: {tag: "fatal", color: "red"},
	error: {tag: "error", color: "red"},
	warn: {tag: "warn", color: "yellow"},
	info: {tag: "info", color: "green"},
	debug: {tag: "debug", color: "green"},
	trace: {tag: "trace", color: "green"}
};

var bus = require("hermes-bus");
var moment = require("moment");
var fs = require("fs");
var colors = require("colors");
var extend = require("extend");
var EOL = require('os').EOL;
var RemoteLogger = require("./remote-logger.js");

var IN_SERVER_MODE = typeof window === "undefined" ? true : false;

var mkdirp = require("mkdirp");
var path = require("path");
var CONFIG_FILENAME = "hermes-log.json";
var CONFIG_DIR_PATH = IN_SERVER_MODE && path.join(process.cwd(), "config");
var CONFIG_FILE_PATH = IN_SERVER_MODE && path.join(CONFIG_DIR_PATH, CONFIG_FILENAME);

var remote;
var activeLevels;

var HermesLog = function () {
	var HermesLog = this;
	HermesLog.constructApi();
	IN_SERVER_MODE ? HermesLog.configInit() : HermesLog.updateActiveLevels();
	HermesLog.subscribeEventListeners();
};

HermesLog.prototype.constructApi = function () {
	var HermesLog = this;

	Object.keys(LEVELS).forEach(function (key) {
		var level = LEVELS[key].tag;

		HermesLog[level] = function () {
			if (activeLevels.indexOf(level) !== -1) {
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

HermesLog.prototype.stdout = function (isEnabled) {
	config.stdout = state;
};

HermesLog.prototype.setLevel = function (level) {
	var HermesLog = this;
	config.logLevel = level;
	HermesLog.updateActiveLevels();
};

HermesLog.prototype.setRemote = function (type, url) {
	config.remote = {type: type, url: url};
	remote = RemoteLogger(config.remote);
}
HermesLog.prototype.updateActiveLevels = function () {
	var HermesLog = this;
	activeLevels = HermesLog.getActiveLevels(config.logLevel);
};

HermesLog.prototype.getActiveLevels = function (level) {
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
	var confFilePath = CONFIG_FILE_PATH;

	var loadAndWatchConfFile = function () {
		HermesLog.loadConfiguration();

		fs.watchFile(confFilePath, function () {
			bus.triggerConfigurationChanged();
		});
	};

	if (!fs.existsSync(confFilePath)) {
		mkdirp.sync(CONFIG_DIR_PATH);
		console.log("****** Hermes-bus configuration file does not exist!\n****** creating default config file: " + confFilePath + "...");

		fs.writeFileSync(confFilePath, JSON.stringify(config, null, 2), "utf8");

		console.log("******", confFilePath + " file is created!");
	}
	loadAndWatchConfFile();

	config.destFile && HermesLog.setupLogFile(HermesLog.getDestFileFullPath());
};

HermesLog.prototype.loadConfiguration = function loadConfiguration() {
	var HermesLog = this;
	var fileConf = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, "utf8"));
	config = extend(config, fileConf);
	// Update activeLevels everytime we load configuration
	HermesLog.updateActiveLevels();
	remote = config.remote ? RemoteLogger(config.remote) : null;
};

HermesLog.prototype.subscribeEventListeners = function () {
	var HermesLog = this;

	bus.subscribe({
		onLogEvent: function (logObject) {
			var formattedLogMsg = HermesLog.constructLogMessageHeader(logObject) + ": " + HermesLog.getParameterizedMessage(logObject);

			config.stdout && console.log(formattedLogMsg[LEVELS[logObject.level].color]);

			config.destFile && IN_SERVER_MODE && HermesLog.logToFile(formattedLogMsg, HermesLog.getDestFileFullPath());

			remote && remote.send(formattedLogMsg);
		},
		onConfigurationChanged: function () {
			var oldDestFile = config.destFile;
			HermesLog.loadConfiguration();

			if (oldDestFile !== config.destFile) {
				HermesLog.setupLogFile(HermesLog.getDestFileFullPath());
			}
		}
	});
};

HermesLog.prototype.getDestFileFullPath = function () {
	return 	path.join(process.cwd(), config.destFile)
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
	if (!fs.existsSync(filepath)) {
		var dirPath = filepath.split(path.sep).splice(0, filepath.split(path.sep).length - 1).join(path.sep);
		mkdirp.sync(dirPath);
		fs.writeFileSync(filepath, "");
	}
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