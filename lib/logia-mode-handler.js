/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var bus = require("hermes-bus");
var FileAppender = require("./logia-file-appender.js");
var LogiaUtils = require("./logia-utils.js");
var IN_FULLSTACK_MODE = false;
var FullstackRemote;

var LogiaModeHandler = function(eventBusline){
    bus.subscribe(eventBusline, {
        onDefaultStdoutLog: function(message, level){
            LogiaUtils.logToStdout(message, level);

        },
        onFullstackStdoutLog: function(message, level){
            LogiaUtils.logToStdout(message, level);
        },
        onDefaultAppendersLog: function(logger, logObj){
            logger.appenders.forEach(function(appender){
                if(appender.fullFilePath){
                    bus[eventBusline].triggerLogToFile(logObj.name, logObj.message, appender);
                }
            });
        },
        onFullstackAppendersLog: function(logObj){
            var logger = require("./logia-module.js")(logObj.name)
            logger.appenders.forEach(function(appender){
                if(appender.fullFilePath){
                    bus[eventBusline].triggerLogToFile(logObj.name, logObj.message, appender);
                }
            });
        },
        onRemoteLog: function(logger, logObj){
            if(IN_FULLSTACK_MODE){
                FullstackRemote.log(logObj);
            } else {
                logger.remotes.forEach(function(remote){
                    remote.log(logObj);
                });
            }
        },
        onEnableFullstackMode: function(url){
            IN_FULLSTACK_MODE = true;
            if(!FullstackRemote){
                FullstackRemote = LogiaUtils.createRemote({protocol: "ws", url: url});
            }
            bus[eventBusline].trigger("configurationChanged");
            bus[eventBusline].disable("defaultStdoutLog");
            bus[eventBusline].disable("defaultAppendersLog");
            bus[eventBusline].enable("fullstackStdoutLog");
            bus[eventBusline].enable("fullstackAppendersLog");
        },
        onDisableFullstackMode: function(){
            IN_FULLSTACK_MODE = false;
            FullstackRemote.terminate();
            FullstackRemote = null;
            bus[eventBusline].trigger("configurationChanged");
            bus[eventBusline].disable("fullstackStdoutLog");
            bus[eventBusline].disable("fullstackAppendersLog");
            bus[eventBusline].enable("defaultStdoutLog");
            bus[eventBusline].enable("defaultAppendersLog");

        }
    })
};


module.exports = LogiaModeHandler;
