/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var CircularJSON = require("circular-json");
var bus = require("hermes-bus");
var util = require("util");
var colors = require("colors");
var FileAppender = null;
var ActiveLoggerNameLengthHandler = require("./active-name-length-handler.js");

var LogiaUtils = {
    toPrettyString: function(value){
        var stringValue = typeof value === "object" ? CircularJSON.stringify(value) : value;
        return stringValue;
    },
    toReadableStringOfDepthOne: function(value){
        var result = util.inspect(value, {depth: 0})
                    .split(",")
                    .reduce(function(final, s){
                        return final + s.trim() + ", ";
                    }, "");

        return result;
    },
    getParameterizedMessage: function (logObject) {
        var parameterizedMsg = logObject._messageArg;
        var params = logObject._params;
        var numOfParams = params.length;
        for(var i = 0; i < numOfParams; i++){
            var parameterValue = LogiaUtils.toPrettyString(params[i]);
            parameterizedMsg = parameterizedMsg.replace(new RegExp("\\{" + i +"\\}", "g"), parameterValue);
        }

        return parameterizedMsg;
    },
    centerAlignString: function(str, extendToLength){
        var extendedStr = str;
        var diff = extendToLength - str.length;
        if(diff > 0){
            extendedStr = LogiaUtils.repeat(" ", Math.floor(diff/2)) +
                            extendedStr +
                            LogiaUtils.repeat(" ",Math.ceil(diff/2));
        }
        return extendedStr;
    },
    createRemote: function(remoteLoggerInstanceConfig){
        /*
        * Minimize checks for validity of LogiaRemote instance by using a No-Op.
        */
        var remote = {log: function(){/* No-Op*/}};
        if(remoteLoggerInstanceConfig){
            try {
                var LogiaRemote = require("./remote.js");
                remote = new LogiaRemote(remoteLoggerInstanceConfig);
            } catch(error){
                console.error((error.message).red);
            }
        }

        return remote;
    },
    repeat: function(str, times){
        var result = "";
        if(times > 0){
            for(var i = 0; i < times; i++){
                result
                        ? result += str
                        : result = str;
            }
        }
        return result;
    },
    setupMasterServer: function(masterServer, options){
        var host = options.host;
        var port = options.port;
        var MasterServer = require("./master-server.js");
        var areOptionsValid = host && port ? true : false;
        if(areOptionsValid){
            masterServer = new MasterServer(options).start();
        } else {
            console.error(("[LOGIA] Invalid master server configuration").red);
        }
        return masterServer;
    },
    isRunningOnServer: function(){
        return typeof window === "undefined" ? true : false;
    },
    createLogMessage: function (logSpecs) {
        var logger  = this;
        var levelInfo = require("./levels.js")[logSpecs.level];
        var loggerName = logSpecs.name;

        var getMessageHeader = function(isColored){
            var level = isColored ? colors[levelInfo.color](levelInfo.pretty) : levelInfo.pretty;
            var name = " [" + loggerName + "]";
            var rightPadding = LogiaUtils.repeat(" ", ActiveLoggerNameLengthHandler.getMax() - loggerName.length);
            var parameterizedMsg = LogiaUtils.getParameterizedMessage(logSpecs);
            var messageWithOrWithoutColor = isColored ? colors.cyan(parameterizedMsg) : parameterizedMsg;
            return [logSpecs.timestamp, " ", level, name, rightPadding, ":", messageWithOrWithoutColor].join("");
        };

        var messageHeader = new String(getMessageHeader());
        messageHeader.color = function(){
            return getMessageHeader(true);
        };

        return messageHeader;
    }
};

if(LogiaUtils.isRunningOnServer()){
    FileAppender = require("./file-appender.js");

    LogiaUtils.toPrettyString = function(value){
        var stringValue = value;
        if(value){
            stringValue = typeof value === "object"
                ? LogiaUtils.toReadableStringOfDepthOne(value)
                : value.toString()
            ;
        }
        return stringValue;
    };
}

module.exports = LogiaUtils;
