/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var Utils = require("./logia-utils.js");

var LEVELS = {
    fatal: {tag: "fatal", color: "red"},
    error: {tag: "error", color: "red"},
    warn: {tag: "warn", color: "yellow"},
    info: {tag: "info", color: "green"},
    debug: {tag: "debug", color: "green"},
    trace: {tag: "trace", color: "green"}
};

var LEVEL_NAME_MAX_LENGTH = Object.keys(LEVELS).sort()[0].length;
Object.keys(LEVELS).forEach(function(level){
    LEVELS[level].pretty =  Utils.centerAlignString(level.toUpperCase(), LEVEL_NAME_MAX_LENGTH);
});

module.exports = LEVELS;
