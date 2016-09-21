var LogiaInitConfig = {
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
};

module.exports = LogiaInitConfig;
