/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var bus = require("hermes-bus");
var FileAppender = require("./file-appender.js");
var Utils = require("./utils.js");
var Config = require("./config.js");
var EVENT_BUSLINE = Config.static.eventBusline;
var IN_MASTER_SLAVE_MODE = false;
var slaveRemote;

var LogiaModeHandlerListener = {
    onStdoutLog: function(message){
        console.log(message);
    },
    onAppendersLog: function(logger, logObj){
        if(IN_MASTER_SLAVE_MODE){
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
        if(IN_MASTER_SLAVE_MODE){
            slaveRemote.log(logObj);
        } else {
            logger.remotes.forEach(function(remote){
                remote.log(logObj);
            });
        }
    },
    onEnableMasterSlaveMode: function(options){
        IN_MASTER_SLAVE_MODE = true;
        if(!slaveRemote){
            slaveRemote = Utils.createRemote({protocol: "ws", url: options.url});
        }
    },
    onDisableMasterSlaveMode: function(){
        IN_MASTER_SLAVE_MODE = false;
        slaveRemote.terminate();
        slaveRemote = null;
    }
};

module.exports = LogiaModeHandlerListener;
