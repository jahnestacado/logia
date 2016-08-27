var fs = require("fs");
var mkdirp = require("mkdirp");
var path = require("path");
var EOL = require('os').EOL;

var FileAppender = {
    setupLogFiles: function(destFileOptions){
        var self = this;
        Object.keys(destFileOptions).forEach(function(key){
            if(destFileOptions[key]){
                var filepath = destFileOptions[key].filepath;
                filepath && self.setupLogFile(filepath);
            }
        });
    },
    setupLogFile: function (filepath) {
        var self = this;
        var fullFilepath = self.getDestFileFullpath(filepath);
        try{
            if (!fs.existsSync(fullFilepath)) {
                var dirPath = filepath.split(path.sep).splice(0, fullFilepath.split(path.sep).length - 1).join(path.sep);
                mkdirp.sync(dirPath);
                fs.writeFileSync(fullFilepath, "");
            }
        } catch(error){
            console.error(error);
        }
    },
    log: function (msg, destPath) {
        fs.appendFile(destPath, msg + EOL, function (error) {
            if (error) {
                console.error(error);
            }
        });
    },
    getDestFileFullpath: function (destFile) {
        return 	path.join(process.cwd(), String(destFile));
    }
};

module.exports = FileAppender;
