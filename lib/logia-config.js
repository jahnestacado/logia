/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var Utils = require("./logia-utils.js");
var LogiaConfig = {
    /**
    * The Logia configuration object.
    * @type {object}
    * @name LogiaConfig
    * @namespace LogiaConfig
    * @property {object} level
    * @property {object} appenders
    * @property {object} remotes
    * @property {object} server
    * @property {boolean} stdout
    * @property {string} dateFormat
    * @property {boolean} overwritable
    */
    runtime: {
        /**
        * We can define n-number of logger-name regexp properties in level
        * @memberof LogiaConfig
        * @property {string} logger_name_regexp - (fatal|error|warn|info|debug|trace).
        */
        level: {
            ".*" : null
        },
        /**
        * We can define n-number of logger-name regexp properties in appenders
        * @memberof LogiaConfig
        * @property {object} logger_name_regexp - {filepath: {string}, maxSize: {number}}
        */
        appenders: {
            "$_fill_logger_name_regexp" : {
                filepath: null,
                maxSize: null
            }
        },
        /**
        * We can define n-number of logger-name regexp properties in remotes
        * @memberof LogiaConfig
        * @property {object} logger_name_regexp - {protocol: {string}, url: {string}}
        */
        remotes: {
            "$_fill_logger_name_regexp" : {
                protocol: null, // {protocol: "ws"|"http", url: ...}
                url: null
            }
        },
        /**
        * If specified it boots up a websocket server
        * @memberof LogiaConfig
        * @property {string} interface
        * @property {number} port
        */
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
