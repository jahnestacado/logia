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
        onLogToFile: function(msg, destFileOptions){
            if(destFileOptions.maxSize){
                logFileTrimmer.scheduleFileTrimIfEligible(destFileOptions);
            }
        }
    });
};

LogFileTrimmer.prototype.scheduleFileTrimIfEligible = function(destFileOptions){
    var logFileTrimmer = this;

    var filepath = destFileOptions.filepath;
    if(!LOG_COUNTER.hasOwnProperty(filepath)){
        LOG_COUNTER[filepath] = LOG_FILE_CHECK_THRESHOLD;
    } else if(LOG_COUNTER[filepath]){
        LOG_COUNTER[filepath]--;
    } else {
        LOG_COUNTER[filepath] = LOG_FILE_CHECK_THRESHOLD;
        logFileTrimmer.trimFileIfNeeded(destFileOptions);
    }
};

LogFileTrimmer.prototype.trimFileIfNeeded = function(destFileOptions){
    var logFileTrimmer = this;

    var maxSize = destFileOptions.maxSize;
    var fullFilePath = destFileOptions.fullFilePath;
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
