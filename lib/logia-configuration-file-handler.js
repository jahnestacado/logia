/**
* curtainjs <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var path = require("path");
var mkdirp = require("mkdirp");
var bus = require("hermes-bus");
var fs = require("fs");
var colors = require("colors");
var extend = require("extend");
var fileAppender = require("./logia-file-appender.js");

var CONFIG_FILENAME = "logia.json";
var CONFIG_DIR_PATH = path.join(process.cwd(), "config");
var CONFIG_FILE_PATH = process.env.LOGIA_CONFIG_FILE_PATH || path.join(CONFIG_DIR_PATH, CONFIG_FILENAME);

var INVALID_FILE_CONF_MSG = "[LOGIA] " + CONFIG_FILE_PATH + ": Invalid configuration JSON string.\nNot updating log configuration...";
var CREATING_CONF_FILE_MSG = "[LOGIA] Configuration file does not exist!\n****** Creating default config file: " + CONFIG_FILE_PATH + "...";
var CONF_FILE_CREATED_MSG = "[LOGIA] " + CONFIG_FILE_PATH + " file is created!";

var ConfigFileHandler = function(config, buslineId){
    var configFileHandler = this;
    configFileHandler.config = config;
    configFileHandler.buslineId = buslineId;

    if (!fs.existsSync(CONFIG_FILE_PATH)) {
        mkdirp.sync(CONFIG_DIR_PATH);
        console.log(CREATING_CONF_FILE_MSG.yellow);
        configFileHandler.writeConfigurationFile(config);
        console.log(CONF_FILE_CREATED_MSG.green);
    }
    configFileHandler.loadAndWatchConfigFile();

    config.appenders && fileAppender.setupLogFiles(config.appenders);
};

ConfigFileHandler.prototype.writeConfigurationFile = function(config){
    var configFileHandler = this;
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), "utf8");
    bus[configFileHandler.buslineId] && bus[configFileHandler.buslineId].trigger("configurationChanged");
};

ConfigFileHandler.prototype.loadAndWatchConfigFile = function() {
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
        onConfigurationChanged: function() {
            var oldAppenders = config.appenders;
            configFileHandler.loadConfiguration(function() {
                if(config.appenders){
                    Object.keys(config.appenders).forEach(function(key){
                        var oldAppender = oldAppenders[key];
                        if (!(oldAppender && oldAppender.filepath && oldAppender.filepath === config.appenders[key].filepath)) {
                            fileAppender.setupLogFile(config.appenders[key].filepath);
                        }
                    });
                }
            });
        }
    });
};

ConfigFileHandler.prototype.loadConfiguration = function(onLoad) {
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
