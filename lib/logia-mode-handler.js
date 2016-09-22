/**
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var bus = require("hermes-bus");
var FileAppender = require("./logia-file-appender.js");
var LogiaUtils = require("./logia-utils.js");

var LogiaModeHandler = function(buslineId){
    bus.subscribe(buslineId, {
        onFullstackModeLog: function(config, logObj){
            config.stdout && LogiaUtils.logToStdout(logObj.message, logObj.level);
            var logger = require("./logia.js")(logObj.name)
            logger.appenders.forEach(function(appender){
                if(appender.fullFilePath){
                    bus[buslineId].triggerLogToFile(logObj.name, logObj.message, appender);
                }
            });
        },
        onDefaultModeLog: function(logger, config, logObj){
            config.stdout && LogiaUtils.logToStdout(logObj.message, logObj.level);

            logger.appenders.forEach(function(appender){
                if(appender.fullFilePath){
                    bus[buslineId].triggerLogToFile(logObj.name, logObj.message, appender);
                }
            });
        },
        onLogToStdout: function(message, level){
            LogiaUtils.logToStdout(message, level);
        },
        onEnableFullstackMode: function(){
            bus[buslineId].disable("defaultModeLog");
            bus[buslineId].enable("fullstackModeLog");
        },
        onDisableFullstackMode: function(){
            bus[buslineId].disable("fullstackModeLog");
            bus[buslineId].enable("defaultModeLog");
        }
    })
};


module.exports = LogiaModeHandler;
