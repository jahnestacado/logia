/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var fs = require("fs");
var bus = require("hermes-bus");
var Config = require("./logia-config.js");
var EVENT_BUSLINE = Config.static.eventBusline;
var EOL = require("os").EOL;
var CHECK_THRESHOLD = 100; // in number of logs
var EOL = require("os").EOL;
var MB_IN_BYTES = 1048576;
var LOG_COUNTER = {};

var FileTrimmerListener = {
    beforeLogToFile: function(name, msg, appender){
        if(appender.maxSize > 0){
            FileTrimmerListener.scheduleFileTrimIfEligible(appender);
        }
    },
    scheduleFileTrimIfEligible: function(appender){
        var filepath = appender.filepath;
        if(!LOG_COUNTER.hasOwnProperty(filepath)){
            LOG_COUNTER[filepath] = CHECK_THRESHOLD;
        } else if(LOG_COUNTER[filepath]){
            LOG_COUNTER[filepath]--;
        } else {
            LOG_COUNTER[filepath] = CHECK_THRESHOLD;
            FileTrimmerListener.trimFileIfNeeded(appender);
        }
    },
    trimFileIfNeeded: function(appender){
        var maxSize = appender.maxSize;
        var fullFilePath = appender.fullFilePath;
        fs.stat(fullFilePath, function(error, stats){
            var fileSizeInMB = stats.size / MB_IN_BYTES;
            if(fileSizeInMB > maxSize){
                FileTrimmerListener.trimToHalf(fullFilePath);
            }
        });
    },
    trimToHalf: function(fullFilePath){
        var fileContent = fs.readFileSync(fullFilePath).toString();
        var fileContentSplitInLines = fileContent.split(EOL);
        var numOfLines = fileContentSplitInLines.length;
        var halfFileContent = fileContentSplitInLines.splice(Math.ceil(numOfLines / 2), numOfLines).join(EOL);
        fs.writeFileSync(fullFilePath, halfFileContent);
    }
};

bus.subscribe(EVENT_BUSLINE, FileTrimmerListener);
