/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var CircularJSON = require("circular-json");
var LogiaRemote = require("./logia-remote.js");
var LogServer = require("./logia-server.js");
var bus = require("hermes-bus");
var IN_SERVER_MODE = typeof window === "undefined" ? true : false;
var util = require("util");
var FileAppender = null;

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
                    },"");

        return result;
    },
    getParameterizedMessage: function (logObject) {
        var parameterizedMsg = logObject.message;
        var params = logObject.params;
        var numOfParams = params.length;
        var i = 0;
        for(i; i < numOfParams; i++){
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
    setupLogServer: function(logServer, config, eventBusline, listeners){
        var host = config.server.interface;
        var port = config.server.port;
        var areOptionsValid = host && port ? true : false;
        var hasConfigChanged = logServer ? (logServer.host !== host) || (logServer.port !== port) : true;
        if(!areOptionsValid){
            logServer && logServer.stop();
            logServer = null;
            console.error(("[LOGIA] Invalid server configuration").red);
        } else if(logServer && areOptionsValid && hasConfigChanged){
            logServer.stop(function(){
                logServer = new LogServer(config, eventBusline, listeners).start();
            });
        } else if(!logServer && areOptionsValid){
                logServer = new LogServer(config, eventBusline, listeners).start();
        }
        return logServer;
    },
    logToStdout: function(message){
        console.log(message);
    }
};

if(IN_SERVER_MODE){
    FileAppender = require("./logia-file-appender.js");

    LogiaUtils.toPrettyString = function(value){
        var stringValue = value;
        if(value){
            stringValue = typeof value === "object"
                                ?  UtilityBelt.toReadableStringOfDepthOne(value)
                                : value.toString();
        }
        return stringValue;
    };
}

module.exports = LogiaUtils;
