/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var Utils = require("./logia-utils.js");
var LogiaConfig = {
    runtime: {
        level: {
            ".*" : null
        },
        appenders: {
            "$_fill_logger_name_regexp" : {
                filepath: null,
                maxSize: null
            }
        },
        remotes: {
            "$_fill_logger_name_regexp" : {
                protocol: null, // {protocol: "ws"|"http", url: ...}
                url: null
            }
        },
        server: {
            interface: null,
            port: null,
        },
        stdout: false,
        dateFormat: "(DD-MM-YYYY HH:mm:ss)",
        overwritable: true
    },
    static: {
        eventBusline: "___LOGIA___",
        inServerMode: Utils.isRunningOnServer()
    }
};

module.exports = LogiaConfig;
