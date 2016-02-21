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

var IN_SERVER_MODE = typeof window === "undefined" ? true : false;
var configFileHandler = require("./configuration-file-handler.js");
IN_SERVER_MODE && configFileHandler.activate(config);

var bus = require("hermes-bus");
var _ = require("lodash");
var moment = require("moment");
var colors = require("colors");
var RemoteConnection = require("./remote-logger.js");
var fileAppender = require("./file-appender.js");

var CACHED_LOGGERS = {};
var remote;

var HermesLog = function (name) {
	var HermesLog = this;

	HermesLog.name = name;
	HermesLog.subscribeEventListeners(name);
	HermesLog.subscribeOnConfigFileChangedListener();
	HermesLog.constructApi(name);
	remote = config.remote ? RemoteConnection(handler.config.remote) : null;
	HermesLog.updateActiveLevels();
};

HermesLog.prototype.constructApi = function (name) {
	var HermesLog = this;

	Object.keys(LEVELS).forEach(function (key) {
		var level = LEVELS[key].tag;

		HermesLog[level] = function () {
			if (HermesLog.activeLevels.indexOf(level) !== -1) {
				//Convert arguments to pure array object
				var args = Array.prototype.slice.call(arguments);
				// Assign log message to msg variable and remove it from the args array
				var msg = args.shift();
				var params = args;
				bus[name].triggerLogEvent({
					message: msg,
					params: params,
					level: level
				});
			}
		};
	});
};

HermesLog.prototype.stdout = function (isEnabled) {
	config.stdout = isEnabled;
};

HermesLog.prototype.setLevel = function (newLogLevel) {
	var HermesLog = this;
	var currentLogLevel = config.logLevel;
	var name = HermesLog.name;

	if(_.isString(currentLogLevel)){
		config.logLevel = {name : newLogLevel};
	} else if(_.isObject(currentLogLevel)){
		currentLogLevel[HermesLog.name] = newLogLevel;
	}

	HermesLog.updateActiveLevels();
};

HermesLog.prototype.getLogLevel = function(){
	var HermesLog = this;
	var level;

	if(_.isString(config.logLevel)){
		level = config.logLevel
	} else if (_.isObject(config.logLevel)){
		level = config.logLevel[HermesLog.name]
	}

	return level;
};

HermesLog.prototype.setRemote = function (type, url) {
	config.remote = {type: type, url: url};
	remote = RemoteConnection(config.remote);
};

HermesLog.prototype.updateActiveLevels = function () {
	var HermesLog = this;
	var level = HermesLog.getLogLevel();
	var activeLevels = [];

	switch (level) {
		case "trace" :
			activeLevels.push(LEVELS.trace.tag);
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

	HermesLog.activeLevels = activeLevels;
};

HermesLog.prototype.subscribeEventListeners = function (name) {
	var HermesLog = this;
	if(!(bus[name] && bus[name].hasEvent("logEvent"))){
		bus.subscribe(name, {
			onLogEvent: function (logObject) {
				var formattedLogMsg = HermesLog.constructLogMessageHeader(name, logObject) + ": " + HermesLog.getParameterizedMessage(logObject);

				config.stdout && console.log(formattedLogMsg[LEVELS[logObject.level].color]);

				config.destFile && IN_SERVER_MODE && fileAppender.logToFile(formattedLogMsg, fileAppender.getDestFileFullPath(config.destFile));

				remote && remote.send(formattedLogMsg);
			},
		});
	}
};

HermesLog.prototype.subscribeOnConfigFileChangedListener = function(){
	var hermesLog = this;
	bus.subscribe({
		afterConfigurationChanged: function () {
			// Update activeLevels everytime we load configuration
			hermesLog.updateActiveLevels();
			remote = config.remote ? RemoteConnection(handler.config.remote) : null;
		}
	});
};


HermesLog.prototype.constructLogMessageHeader = function (name, logObject) {
	var timestamp = IN_SERVER_MODE ? moment().format(config.dateFormat) : Date();
	return "(" + timestamp + "){"+ name +"}[" + logObject.level.toUpperCase() + "]";
};

HermesLog.prototype.getParameterizedMessage = function (logObject) {
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

var Constructor = function(name){
	var logger;

	if(CACHED_LOGGERS[name]){
		logger = CACHED_LOGGERS[name];
	} else{
		logger = new HermesLog(name);
		CACHED_LOGGERS[name] = logger;
	}

	return logger;
};

module.exports = Constructor;
