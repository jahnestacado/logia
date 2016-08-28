/**
* curtainjs <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var fs = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var EOL = require('os').EOL;

var FileAppender = {
    setupLogFiles: function(appenders){
        var self = this;
        Object.keys(appenders).forEach(function(key){
            if(appenders[key]){
                var filepath = appenders[key].filepath;
                filepath && self.setupLogFile(filepath);
            }
        });
    },
    setupLogFile: function (filepath) {
        var self = this;
        var fullFilepath = self.getDestFileFullpath(filepath);
        try{
            if (!fs.existsSync(fullFilepath)) {
                var dirPath = fullFilepath.split(path.sep).splice(0, fullFilepath.split(path.sep).length - 1).join(path.sep);
                mkdirp.sync(dirPath);
                fs.writeFileSync(fullFilepath, "");
            }
        } catch(error){
            console.error(error);
        }
    },
    log: function (msg, fileFullpath) {
        fs.appendFile(fileFullpath, msg + EOL, function (error) {
            if (error) {
                console.error(error);
            }
        });
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
