var path = require("path");
var mkdirp = require("mkdirp");
var bus = require("hermes-bus");
var fs = require("fs");
var colors = require("colors");
var extend = require("extend");
var fileAppender = require("./hermes-log-file-appender.js");

var CONFIG_FILENAME = "hermes-log.json";
var CONFIG_DIR_PATH = path.join(process.cwd(), "config");
var CONFIG_FILE_PATH = path.join(CONFIG_DIR_PATH, CONFIG_FILENAME);
var isOriginalDefaultConfig = false;

var INVALID_FILE_CONF_MSG = "****** " + CONFIG_FILE_PATH + ": Invalid configuration JSON string.\nNot updating hermes-log configuration...";
var CREATING_CONF_FILE_MSG = "****** Hermes-bus configuration file does not exist!\n****** creating default config file: " + CONFIG_FILE_PATH + "...";
var CONF_FILE_CREATED_MSG = "****** " + CONFIG_FILE_PATH + " file is created!";

var ConfigFileHandler = function(config, buslineId){
    var configFileHandler = this;
    configFileHandler.config = config;
    configFileHandler.buslineId = buslineId;

    if (!fs.existsSync(CONFIG_FILE_PATH)) {
        mkdirp.sync(CONFIG_DIR_PATH);
        console.log(CREATING_CONF_FILE_MSG.yellow);
        isOriginalDefaultConfig = true;
        configFileHandler.writeConfigurationFile(config);
        console.log(CONF_FILE_CREATED_MSG.green);
    }
    configFileHandler.loadAndWatchConfigFile();

    config.destFile && fileAppender.setupLogFiles(config.destFile);
};

ConfigFileHandler.prototype.writeConfigurationFile = function(config){
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), "utf8");
    bus[configFileHandler.buslineId] && bus[configFileHandler.buslineId].trigger("configurationChanged");
};

ConfigFileHandler.prototype.loadAndWatchConfigFile = function () {
    var configFileHandler = this;

    configFileHandler.subscribeOnConfigFileChangedListener();
    configFileHandler.loadConfiguration(function() {
        fs.watchFile(CONFIG_FILE_PATH, function() {
            bus[configFileHandler.buslineId].trigger("configurationChanged");
        });
    });
};

ConfigFileHandler.prototype.subscribeOnConfigFileChangedListener = function(){
    var configFileHandler = this;
    var config = configFileHandler.config;

    bus.subscribe(configFileHandler.buslineId, {
        onConfigurationChanged: function () {
            var oldDestFile = config.destFile;
            configFileHandler.loadConfiguration(function() {
                Object.keys(config.destFile).forEach(function(key){
                    if (!(oldDestFile[key] && oldDestFile[key] === config.destFile[key])) {
                        fileAppender.setupLogFile(config.destFile[key]);
                    }
                });
            });
        }
    });
};

ConfigFileHandler.prototype.loadConfiguration = function loadConfiguration(onLoad) {
    var configFileHandler = this;

    try{
        var fileConf = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, "utf8"));
        configFileHandler.config = extend(configFileHandler.config, fileConf);
        onLoad();
    } catch(e){
        console.error(INVALID_FILE_CONF_MSG.red);
    }
};

module.exports = ConfigFileHandler;
