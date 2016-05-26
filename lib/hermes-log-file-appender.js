var fs = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var EOL = require('os').EOL;

var FileAppender = {
    setupLogFiles : function(configObject){
        var self = this;
        Object.keys(configObject).forEach(function(key){
            var filepath = configObject[key];
            self.setupLogFile(filepath);
        });
    },
    setupLogFile : function (destFile) {
        var self = this;
        var filepath = self.getDestFileFullPath(destFile);
        if (!fs.existsSync(filepath)) {
            var dirPath = filepath.split(path.sep).splice(0, filepath.split(path.sep).length - 1).join(path.sep);
            mkdirp.sync(dirPath);
            fs.writeFileSync(filepath, "");
        }
    },
    logToFile : function (msg, destPath) {
        fs.appendFile(destPath, msg + EOL, function (error) {
            if (error) {
                console.log(error);
            }
        });
    },
    getDestFileFullPath : function (destFile) {
        return 	path.join(process.cwd(), destFile);
    }
};

module.exports = FileAppender;
