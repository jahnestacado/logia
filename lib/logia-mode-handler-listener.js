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
var IN_SLAVE_MODE = false;
var slaveRemote;

var LogiaModeHandlerListener = {
    onStdoutLog: function(message){
        console.log(message);
    },
    onAppendersLog: function(logger, logObj){
        if(IN_SLAVE_MODE){
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
        if(IN_SLAVE_MODE){
            slaveRemote.log(logObj);
        } else {
            logger.remotes.forEach(function(remote){
                remote.log(logObj);
            });
        }
    },
    onEnableSlaveMode: function(url){
        IN_SLAVE_MODE = true;
        if(!slaveRemote){
            slaveRemote = Utils.createRemote({protocol: "ws", url: url});
        }
        bus[EVENT_BUSLINE].trigger("configurationChanged");
    },
    onDisableSlaveMode: function(){
        IN_SLAVE_MODE = false;
        slaveRemote.terminate();
        slaveRemote = null;
        bus[EVENT_BUSLINE].trigger("configurationChanged");
    }
};

module.exports = LogiaModeHandlerListener;
