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
    onDefaultStdoutLog: function(message){
        Utils.logToStdout(message);
    },
    onFullstackStdoutLog: function(message){
        Utils.logToStdout(message);
    },
    onDefaultAppendersLog: function(logger, logObj){
        logger.appenders.forEach(function(appender){
            if(appender.fullFilePath){
                bus[EVENT_BUSLINE].triggerLogToFile(logObj.name, logObj.message, appender);
            }
        });
    },
    onFullstackAppendersLog: function(logObj){
        var logger = require("./logia-factory.js")(logObj.name)
        logger.appenders.forEach(function(appender){
            if(appender.fullFilePath){
                bus[EVENT_BUSLINE].triggerLogToFile(logObj.name, logObj.message, appender);
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
            FullstackRemote = Utils.createRemote({protocol: "ws", url: url});
        }
        bus[EVENT_BUSLINE].trigger("configurationChanged");
        bus[EVENT_BUSLINE].disable("defaultStdoutLog");
        bus[EVENT_BUSLINE].disable("defaultAppendersLog");
        bus[EVENT_BUSLINE].enable("fullstackStdoutLog");
        bus[EVENT_BUSLINE].enable("fullstackAppendersLog");
    },
    onDisableFullstackMode: function(){
        IN_FULLSTACK_MODE = false;
        FullstackRemote.terminate();
        FullstackRemote = null;
        bus[EVENT_BUSLINE].trigger("configurationChanged");
        bus[EVENT_BUSLINE].disable("fullstackStdoutLog");
        bus[EVENT_BUSLINE].disable("fullstackAppendersLog");
        bus[EVENT_BUSLINE].enable("defaultStdoutLog");
        bus[EVENT_BUSLINE].enable("defaultAppendersLog");
    }
};

module.exports = LogiaModeHandlerListener;
