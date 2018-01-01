/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var fs = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var EOL = require('os').EOL;
var fileWriteStreams = {};

var FileAppender = {
    setupLogFiles: function(appenders){
        var self = this;

        if(!appenders) {
            Object.keys(fileWriteStreams).forEach(function(fileStreamPath){
                    fileWriteStreams[fileStreamPath].end();
                    delete fileWriteStreams[fileStreamPath];
            });
        } else {
            var filepaths = Object.keys(appenders)
                .filter(function(key){return key && appenders[key] && appenders[key].filepath})
                .map(function(key){
                    return self.getDestFileFullpath(appenders[key].filepath);
            });

            filepaths.forEach(self.setupLogFile.bind(this));

            Object.keys(fileWriteStreams).forEach(function(fileStreamPath){
                if(filepaths.indexOf(fileStreamPath) === -1) {
                    fileWriteStreams[fileStreamPath].end();
                    delete fileWriteStreams[fileStreamPath];
                }
            });
        }
    },
    setupLogFile: function (fullFilepath) {
        var self = this;
        try {
            if (fullFilepath && !fileWriteStreams[fullFilepath]) {
                var dirPath = fullFilepath.split(path.sep).splice(0, fullFilepath.split(path.sep).length - 1).join(path.sep);
                mkdirp.sync(dirPath);

                var wstream = fs.createWriteStream(fullFilepath, {flags: "a"});
                wstream.on("error", console.log);
                fileWriteStreams[fullFilepath] = wstream;
            }
        } catch(error){
            console.error(error);
        }
    },
    log: function (msg, fileFullpath) {
        fileWriteStreams[fileFullpath].write(msg + EOL);
    },
    getDestFileFullpath: function (filepath) {
        var fileFullpath = filepath;
        var isRelativePathRegExp = /^\.\//;
        if(isRelativePathRegExp.test(fileFullpath)){
            fileFullpath = path.join(process.cwd(), filepath);
        }
        return 	fileFullpath;
    }
};

module.exports = FileAppender;
