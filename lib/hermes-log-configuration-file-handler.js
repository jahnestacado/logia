var path = require("path");
var mkdirp = require("mkdirp");
var bus = require("hermes-bus");
var fs = require("fs");
var extend = require("extend");
var fileAppender = require("./hermes-log-file-appender.js");

var CONFIG_FILENAME = "hermes-log.json";
var CONFIG_DIR_PATH = path.join(process.cwd(), "config");
var CONFIG_FILE_PATH = path.join(CONFIG_DIR_PATH, CONFIG_FILENAME);
var isOriginalDefaultConfig = false;

var ConfigFileHandler = {
    activate : function (config) {
        var configFileHandler = this;

        configFileHandler.config = config;
        configFileHandler.init();
    },
    init : function () {
        var configFileHandler = this;
        var config = configFileHandler.config;

        if (!fs.existsSync(CONFIG_FILE_PATH)) {
            mkdirp.sync(CONFIG_DIR_PATH);
            console.log("****** Hermes-bus configuration file does not exist!\n****** creating default config file: " + CONFIG_FILE_PATH + "...");

            isOriginalDefaultConfig = true;
            configFileHandler.writeConfigurationFile(config);

            console.log("******", CONFIG_FILE_PATH + " file is created!");
        }
        configFileHandler.loadAndWatchConfigFile();

        config.destFile && fileAppender.setupLogFiles(config.destFile);
	},
	writeConfigurationFile: function(config){
		fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), "utf8");
		bus.triggerConfigurationChanged && bus.triggerConfigurationChanged();
	},
	loadAndWatchConfigFile : function () {
		var configFileHandler = this;

        configFileHandler.subscribeOnConfigFileChangedListener();
        configFileHandler.loadConfiguration();

        fs.watchFile(CONFIG_FILE_PATH, function () {
            bus.triggerConfigurationChanged();
        });
    },
    subscribeOnConfigFileChangedListener : function(){
        var configFileHandler = this;
        var config = configFileHandler.config;

		bus.subscribe({
			onConfigurationChanged: function () {
				var oldDestFile = config.destFile;
				configFileHandler.loadConfiguration();

                Object.keys(config.destFile).forEach(function(key){
                    if (!(oldDestFile[key] && oldDestFile[key] === config.destFile[key])) {
                        fileAppender.setupLogFile(config.destFile[key]);
                    }
                });
			}
		});
	},
	loadConfiguration : function loadConfiguration() {
		var configFileHandler = this;

        var fileConf = JSON.parse(fs.readFileSync(CONFIG_FILE_PATH, "utf8"));
        configFileHandler.config = extend(configFileHandler.config, fileConf);
    }
};

module.exports = ConfigFileHandler;
