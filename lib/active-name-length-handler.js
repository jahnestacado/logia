/*
* logia <https://github.com/jahnestacado/logia>
* Copyright (c) 2016 Ioannis Tzanellis
* Licensed under the MIT License (MIT).
*/
var ACTIVE_LOGGER_NAME_MAX_LENGTH = 0;
/*
 * This is a half-baked solution and it doesn't take under account the
 * active levels. Currently the max value is the length of the longest
 * logger name that has been instantiated
 */

 // var bus = require("hermes-bus");
 // var Config = require("./config.js");
//  var EVENT_BUSLINE = Config.static.eventBusline;
// bus.subscribe(EVENT_BUSLINE, {
//     beforeConfigurationChanged: function () {
//         ACTIVE_LOGGER_NAME_MAX_LENGTH = 0;
//     }
// });

var NameLengthHandler = {
    update: function(name){
        ACTIVE_LOGGER_NAME_MAX_LENGTH = Math.max(ACTIVE_LOGGER_NAME_MAX_LENGTH, name.length);
    },
    getMax: function(){
        return ACTIVE_LOGGER_NAME_MAX_LENGTH;
    }
};

module.exports = NameLengthHandler;
