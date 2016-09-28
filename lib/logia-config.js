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
            "$null" : {
                filepath: null,
                maxSize: null
            }
        },
        remotes: {
            "$null" : {
                protocol: null, // {protocol: "ws"|"http", url: ...}
                url: null
            }
        },
        server: {
            interface: "localhost",
            port: 6543,
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