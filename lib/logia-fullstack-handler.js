var bus = require("hermes-bus");
var FileAppender = require("./logia-file-appender.js");
var Logia = require("./logia.js");
var LogiaUtils = require("./logia-utils.js");

var LogiaFullstackHandler = function(buslineId){
    bus.subscribe(buslineId, {
        // onFullstackLogReceived: function(logObj){
        //     var logger = Logia(logObj.name);
        //     FileAppender.logToFile()
        // },
        onLogToStdout: function(message, level){
            LogiaUtils.logToStdout(message, level);
        },
        onLogToFullstackStdout: function(message, level){
            LogiaUtils.logToStdout(message, level);
        },
        onEnableFullstackMode: function(){
            bus[buslineId].disable("logToStdout");
            bus[buslineId].disable("logToFile");
            bus[buslineId].enable("logToFullstackStdout");
            bus[buslineId].enable("logToFullstackFile");
        },
        onDisableFullstackMode: function(){
            bus[buslineId].disable("logToFullstackStdout");
            bus[buslineId].disable("logToFullstackFile");
            bus[buslineId].enable("logToStdout");
            bus[buslineId].enable("logToFile");
        }
    })
};


module.exports = LogiaFullstackHandler;
