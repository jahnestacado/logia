/**
* curtainjs <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var bus = require("hermes-bus");
var EOL = require("os").EOL;
var fs = require("fs");
var LOG_FILE_CHECK_THRESHOLD = 100; // in number of logs
var EOL = require("os").EOL;
var MB_IN_BYTES = 1048576;
var LOG_COUNTER = {};

var LogFileTrimmer = function(buslineId){
    var logFileTrimmer = this;

    bus.subscribe(buslineId, {
        onLogToFile: function(name, msg, appender){
            if(appender.maxSize){
                logFileTrimmer.scheduleFileTrimIfEligible(appender);
            }
        }
    });
};

LogFileTrimmer.prototype.scheduleFileTrimIfEligible = function(appender){
    var logFileTrimmer = this;

    var filepath = appender.filepath;
    if(!LOG_COUNTER.hasOwnProperty(filepath)){
        LOG_COUNTER[filepath] = LOG_FILE_CHECK_THRESHOLD;
    } else if(LOG_COUNTER[filepath]){
        LOG_COUNTER[filepath]--;
    } else {
        LOG_COUNTER[filepath] = LOG_FILE_CHECK_THRESHOLD;
        logFileTrimmer.trimFileIfNeeded(appender);
    }
};

LogFileTrimmer.prototype.trimFileIfNeeded = function(appender){
    var logFileTrimmer = this;

    var maxSize = appender.maxSize;
    var fullFilePath = appender.fullFilePath;
    fs.stat(fullFilePath, function(error, stats){
        var fileSizeInMB = stats.size / MB_IN_BYTES;
        if(fileSizeInMB > maxSize){
            logFileTrimmer.trimToHalf(fullFilePath);
        }
    });
};

LogFileTrimmer.prototype.trimToHalf = function(fullFilePath){
    var fileContent = fs.readFileSync(fullFilePath).toString();
    var fileContentSplitInLines = fileContent.split(EOL);
    var numOfLines = fileContentSplitInLines.length;
    var halfFileContent = fileContentSplitInLines.splice(Math.ceil(numOfLines / 2), numOfLines).join(EOL);
    fs.writeFileSync(fullFilePath, halfFileContent);
};

module.exports = LogFileTrimmer;
