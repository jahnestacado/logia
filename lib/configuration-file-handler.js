/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var path = require("path");
var mkdirp = require("mkdirp");
var bus = require("hermes-bus");
var fs = require("fs");
var colors = require("colors");
var CircularJSON = require("circular-json");
var extend = require("extend");
var FileAppender = require("./file-appender.js");
var Config = require("./config.js");
var RUNTIME_CONFIG = Config.runtime;
var EVENT_BUSLINE = Config.static.eventBusline;

var CONFIG_FILENAME = "logia.json";
var CONFIG_DIR_PATH = path.join(process.cwd(), "config");
var CONFIG_FILE_PATH = process.env.LOGIA_CONFIG_FILE_PATH || path.join(CONFIG_DIR_PATH, CONFIG_FILENAME);

var INVALID_FILE_CONF_MSG = "[LOGIA] " + CONFIG_FILE_PATH + ": Invalid configuration JSON string.\nNot updating log configuration...";
var CREATING_CONF_FILE_MSG = "[LOGIA] Configuration file does not exist!\n[LOGIA] Creating default config file: " + CONFIG_FILE_PATH + "...";
var CONF_FILE_CREATED_MSG = "[LOGIA] " + CONFIG_FILE_PATH + " file has been created!";

var ConfigFileHandler = function(){
    var configFileHandler = this;
    if (!fs.existsSync(CONFIG_FILE_PATH)) {
        mkdirp.sync(CONFIG_DIR_PATH);
        console.log(CREATING_CONF_FILE_MSG.yellow);
        configFileHandler.writeConfigurationFile(RUNTIME_CONFIG);
        console.log(CONF_FILE_CREATED_MSG.green);
    }

    configFileHandler.onConfigurationChangedListener = {
        onConfigurationChanged: function(config) {
            try {
                config || configFileHandler.loadConfiguration();
                FileAppender.setupLogFiles(RUNTIME_CONFIG.appenders);
            } catch(error){
                console.error(error);
            }
        }
    };

    configFileHandler.enable();
    RUNTIME_CONFIG.appenders && FileAppender.setupLogFiles(RUNTIME_CONFIG.appenders);

    bus.subscribe(EVENT_BUSLINE, {
        onEnableMasterSlaveMode: function(options){
            if(options.type === "slave"){
                configFileHandler.disable();
            }
        },
        onDisableMasterSlaveMode: function(options){
            if(options.type === "slave"){
                configFileHandler.enable();
            }
        }
    });

};

ConfigFileHandler.prototype.writeConfigurationFile = function(config){
    fs.writeFileSync(CONFIG_FILE_PATH, CircularJSON.stringify(config, null, 2), "utf8");
    bus[EVENT_BUSLINE] && bus[EVENT_BUSLINE].trigger("configurationChanged");
};

ConfigFileHandler.prototype.loadAndWatchConfigFile = function() {
    var configFileHandler = this;
    try {
        configFileHandler.loadConfiguration();
        fs.watchFile(CONFIG_FILE_PATH, function() {
            bus[EVENT_BUSLINE].trigger("configurationChanged");
        });
    } catch(error){
        console.error(error);
    }
};

ConfigFileHandler.prototype.loadConfiguration = function(onLoad) {
    try {
        var fileConf = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, "utf8"));
        extend(RUNTIME_CONFIG, fileConf);
    } catch(error){
        throw new Error(INVALID_FILE_CONF_MSG.red);
    }
};

ConfigFileHandler.prototype.enable = function(){
    var configFileHandler = this;
    bus.subscribe(EVENT_BUSLINE, configFileHandler.onConfigurationChangedListener);
    configFileHandler.loadAndWatchConfigFile();
};

ConfigFileHandler.prototype.disable = function(){
    var configFileHandler = this;
    fs.unwatchFile(CONFIG_FILE_PATH);
    bus.unsubscribe(EVENT_BUSLINE, configFileHandler.onConfigurationChangedListener);
};

module.exports = new ConfigFileHandler();
