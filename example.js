const { response } = require("express");
const async = require("hbs/lib/async");
const upsUrl = "http://localhost:3001";
const worldURL = "localhost";
const worldPort = "12345";
const axios = require('axios').default;
const protobuf = require('protobufjs');
const amazonProto = "world_amazon.proto";
const upsProto =  "world_ups.proto";
const net = require('net');
const { isBigInt64Array } = require("util/types");

let worldid = -1;
var initWorld = false;

exports.connectWithInitWh = async(req, res) => {
    // upsInitWorld();
    amazonConnectWorld();
}

function amazonConnectWorld() {
    const request = {
        isAmazon : true,
        initwh: [
            {
                "id" : 0,
                "x": 1000,
                "y": 800
            },
            {
                "id": 3,
                "x": 600,
                "y": 900
            }
        ],
        worldid: 41
    };
    // amazon connnect
    protobuf.load(amazonProto, (err, root) => {
        if (err) {
            throw err;
        }
        
        let AconnectMessage = root.lookupType('AConnect');
        let AConnectedMessage = root.lookup('AConnected');
        // create message
        let payload = {worldid: 41, isAmazon : true};
        let errMsg = AconnectMessage.verify(payload);
        if (errMsg) {
            console.log(errMsg);
        }
        
        else {
            console.log('gpb: verified payload');
        }
        // create a message type
        let connectPayload = AconnectMessage.create(payload);
        let encodedPayload = AconnectMessage.encodeDelimited(connectPayload).finish();
        // console.log(AconnectMessage.toObject(connectPayload, {isAmazon : Boolean}));

        // connect to the world server
        const client = net.createConnection({port: worldPort}, () => {
            console.log('socket: connect to world server on port 1234!');
            client.write(encodedPayload);
        });

        var data = [];
        client.on('data', (chunk) => {            
            data.push(chunk);
        });

        client.on('end', () => {
            data = Buffer.concat(data);
            let decoded = AConnectedMessage.decodeDelimited(data);
            
            console.log("socket: recv message " + JSON.stringify(decoded));
            console.log('socket: disconnect from world server');
        });
        
    });
}

function upsInitWorld() {
    // ups connect
    protobuf.load(upsProto, (err, root) => {
        if (err) {
            throw err;
        }

        let UConnectMessge = root.lookupType('UConnect');
        let payload = {isAmazon : false};

        let connectPayload = UConnectMessge.create(payload);
        let buffer = UConnectMessge.encodeDelimited(connectPayload).finish();

        const client = net.createConnection({port: 23456}, ()=> {
            console.log("socket: connect to world server on port 23456!");
            client.write(buffer);
        });

        client.on('data', (data) => {
            console.log('socket: ups decode msg ' + data);
        });

    });
}

exports.connect = async (req, res, next) => {
    const request = {
        "isAmazon": true,
    };
    
    await axios.post(worldURL+ "/connect", request)
        .then((res) => connectWorldHandler(res));
    next();
}

exports.request = async (req, res, next) => {
    const request = {
        "seqnum": 1000
    };
    await axios.post(upsUrl+"/connectWorld", request)
        .then((res) => getWorldHandler(res));
    next();
}

function getWorldHandler(res) {
    console.log("ups: get worlid" + res.data.worldid);
}

function connectWorldHandler(res) {
    const data = res.data;
    if (data.result !== "connected!") {
        // TODO: do some scheduler stuff
        console.log("connect to world: error not connect to world");
        return;
    }
    console.log("connect to world: " + res.data.worldid);
}

function errorHandler(err) {
    console.log("Error: " + err.message);
}