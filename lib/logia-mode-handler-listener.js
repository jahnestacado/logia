/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var bus = require("hermes-bus");
var FileAppender = require("./logia-file-appender.js");
var Utils = require("./logia-utils.js");
var Config = require("./logia-config.js");
var EVENT_BUSLINE = Config.static.eventBusline;
var IN_FULLSTACK_MODE = false;
var FullstackRemote;

var LogiaModeHandlerListener = {
    onStdoutLog: function(message){
        console.log(message);
    },
    onAppendersLog: function(logger, logObj){
        if(IN_FULLSTACK_MODE){
            logger.appenders.forEach(function(appender){
                if(appender.fullFilePath){
                    bus[EVENT_BUSLINE].triggerLogToFile(logObj.name, logObj.logMessage, appender);
                }
            });
        } else{
            logger.appenders.forEach(function(appender){
                if(appender.fullFilePath){
                    bus[EVENT_BUSLINE].triggerLogToFile(logObj.name, logObj.logMessage, appender);
                }
            });
        }
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
            FullstackRemote = Utils.createRemote({protocol: "ws", url: url});
        }
        bus[EVENT_BUSLINE].trigger("configurationChanged");
    },
    onDisableFullstackMode: function(){
        IN_FULLSTACK_MODE = false;
        FullstackRemote.terminate();
        FullstackRemote = null;
        bus[EVENT_BUSLINE].trigger("configurationChanged");
    }
};

module.exports = LogiaModeHandlerListener;
