import express from 'express';
import routes from './src/routes/main_route';
import mongoose from 'mongoose';
import jspb from 'protobufjs';
import net from 'net';
import { addNewOrder } from './src/controllers/main_controller';
import { request } from 'http';

const app = express();
var path = require('path')

const SERVER_ERROR = 500;
const REQUEST_ERROR = 400;
const PORT_NUM = 8000;
const PORT = process.env.PORT || PORT_NUM;
const WORLD_URL = 'localhost';
const WORLD_PORT_NUM = 12345;
const UPS_PROTO = 'world_ups.proto';
const WORLD_SIM_SERVER = connectToWorldSimServer();
const NUM_TRUCKS = 100;
var WORLD_ID = null;
const PICKUP_QUEUE = [];
const IDLE_TRUCKS = [];
const PACKAGE_TRUCK_MAP = {};
var trackingNumber = 0;
var seqNum = 0;

/*
{
    "trackingNumber": 2345
    "warehouseId": 1234
}
*/


// ejs view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//bodyparser setup
app.use(express.static("public"));
app.use(express.urlencoded({extended: true}));

// Changed to String
app.use(express.text());

routes(app);


// mongoose connection
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://127.0.0.1/UPSdb',{
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.catch(err => console.log( err ))
.then(() => console.log( 'Database Connected' ));



app.get('/test', async function (req, res) {
    sendRequestToWorld({type: 'pickup', whid: 2});
    res.json({"startDelivery": {"result": "ok", "trackingNumber": String(trackingNumber)}});
});

app.get('/worldid', async function (req, res) {
    res.send(JSON.stringify({"worldid" : WORLD_ID}));

});

app.post('/amazonEndpoint', async function (req, res) {
    let request = JSON.parse(req.body);
    if (request.startDelivery !== undefined ) {
        try {
            await addNewOrder(request, trackingNumber);
            let pickup = {type: 'pickup', whid: Number(request.startDelivery.warehouseID), packageid: trackingNumber}
            let truckid = IDLE_TRUCKS.shift()
            if (truckid === undefined) {
                PICKUP_QUEUE.push(pickup);
            } else {
                pickup['truckid'] = truckid;
                PACKAGE_TRUCK_MAP[trackingNumber] = Number(truckid);
                sendRequestToWorld(pickup);
            }
            res.send(JSON.stringify({"startDelivery": {"result": "ok", "trackingNumber": String(trackingNumber)}}));
            trackingNumber++;
        } catch (err) {
            res.status(REQUEST_ERROR).send(err);
        }
    } else if (request.deliveryStatus !== undefined) {

    } else if (request.truckLoaded !== undefined) {

    } else if (request.editAddress !== undefined) {

    } else if (request.cancelAddress !== undefined) {

    } else {
        res.status(REQUEST_ERROR).send("Missing parameters");
    }
});

function generatePickupPayload(command, root) {
    let UGoPickup = root.lookupType('UGoPickup');
    let pickupPayload = {truckid: command.truckid, whid: command.whid, seqnum: seqNum};
    let errMsg = UGoPickup.verify(pickupPayload);
    if (errMsg) {
        throw Error(errMsg);
    }
    return pickupPayload;
}

function generateDeliverPayload(command, root) {
    let UGoDeliver = root.lookupType('UGoDeliver');
    let UDeliveryLocation = root.lookupType('UDeliveryLocation');
    let deliveryLocationPayload = {packageid: command.packageid, x: command.x, y: command.y};
    let errMsg = UDeliveryLocation.verify(deliveryLocationPayload);
    if (errMsg) {
        throw Error(errMsg);
    }
    let deliverPayload = {truckid: command.truckid, packages: [deliveryLocationPayload], seqnum: seqNum};
    errMsg = UGoDeliver.verify(deliverPayload);
    if (errMsg) {
        throw Error(errMsg);
    }
    return deliverPayload;
}

function sendRequestToWorld(command) {
    jspb.load(UPS_PROTO, (err, root) => {
        if (err) {
            throw Error(err);
        }
        let UCommands = root.lookupType('UCommands');
        let commandPayload;
        if (command.type === 'pickup') {
            commandPayload = {pickups: [generatePickupPayload(command, root)]};
        } else {
            commandPayload = {deliveries: [generateDeliverPayload(command, root)]};
        }
        let errMsg = UCommands.verify(commandPayload);
        if (errMsg) {
            throw Error(errMsg);
        }
        let message = UCommands.create(commandPayload);
        console.log(message);
        let buffer = UCommands.encodeDelimited(message).finish();
        if (WORLD_SIM_SERVER.write(buffer)) {
            seqNum++;
        } else {
            JOB_QUEUE.push(command);
        }
    });
}

function handleWorldResponses(data) {
    console.log("Data received from world simulator server");
    jspb.load(UPS_PROTO, (err, root) => {
        if (err) {
            throw err;
        }
        try {
            let UConnected = root.lookupType('UConnected');
            let message = UConnected.decodeDelimited(data);
            if (message.result == 'connected!') {
                WORLD_ID = Number(message.worldid);
                console.log("Connected to world " + WORLD_ID);
            }
            console.log(message);
        } catch (err){
            let UResponses = root.lookupType('UResponses');
            let message = UResponses.decodeDelimited(data);
            handleUResponses(message);
            console.log(message);

        }
    });
}

function handleUResponses(response) {
    let completions = response.completions;
    for (let i = 0; i < completions.length; i++) {
        handleFinishedTruck(completions[i]);
    }
}

function handleFinishedTruck(finished) {
    let status = finished.status;
    //update database
    if (status === 'idle') {
        IDLE_TRUCKS.push(finished.truckid);
        
    }
}

function connectToWorldSimServer() {
    let worldSimServer = new net.Socket();
    worldSimServer.on('connect', () => {
        console.log("Connected to world simulator server!");
        connectToWorld();
    });
    worldSimServer.on('data', handleWorldResponses);
    worldSimServer.on('close', () => {
        console.log("Disconnected from world simulator server");
        setTimeout(() => {
            WORLD_SIM_SERVER.connect({host: WORLD_URL, port: WORLD_PORT_NUM});
        }, 10000);
    });
    worldSimServer.on('error', (err) => {
        console.log("Something went wrong with world simulator server socket connection");
    });
    
    worldSimServer.connect({host: WORLD_URL, port: WORLD_PORT_NUM});
    return worldSimServer;
}

function connectToWorld() {
    jspb.load(UPS_PROTO, (err, root) => {
        if (err) {
            throw Error(err);
        }
        let UConnect = root.lookupType('UConnect');
        let UInitTruck = root.lookupType("UInitTruck");
        let UInitTruckPayload = [];
        for (let i = 0; i < NUM_TRUCKS; i++) {
            let temp = { id: i, x: 10, y: 1 }
            let errMsg = UInitTruck.verify(temp);
            if (errMsg) {
                throw Error(errMsg);
            }
            UInitTruckPayload.push(temp);
            IDLE_TRUCKS.push(i);
        }
        let UConnectPayload = {trucks: UInitTruckPayload, isAmazon: false};
        if (WORLD_ID != null) {
            UConnectPayload = {worldid: WORLD_ID, isAmazon: false};
        }
        let errMsg = UConnect.verify(UConnectPayload);
        if (errMsg) {
            throw Error(errMsg);
        }
        let message = UConnect.create(UConnectPayload);
        let buffer = UConnect.encodeDelimited(message).finish();
        WORLD_SIM_SERVER.write(buffer);
        //receiveRequestFromWorld();
    });
}


app.listen(PORT, () => {
    console.log("Listening on port " + PORT + "...");
});

/*
app.get('/disconnect', async function (req, res) {
    disconnectFromWorld();
    res.json({"worldid" : WORLD_ID});
});

function disconnectFromWorld() {
    jspb.load(UPS_PROTO, (err, root) => {
        if (err) {
            throw Error(err);
        }
        let UCommands = root.lookupType('UCommands');
        let command = {disconnect: true};
        let errMsg = UCommands.verify(command);
        if (errMsg) {
            throw Error(errMsg);
        }
        let request = UCommands.create(command);
        let buffer = UCommands.encodeDelimited(request).finish();
        WORLD_SIM_SERVER.write(buffer);
        //receiveRequestFromWorld();
    });
}
*/

/*
function receiveRequestFromWorld() {
    return new Promise((resolve, reject) => {
        WORLD_SIM_SERVER.on('data', function onData(data) {
            WORLD_SIM_SERVER.off('data', onData);
            promiseHandleWorldResponses(data, resolve)
        });
    });
}

function promiseHandleWorldResponses(data, resolve) {
    console.log("Data received from world simulator server");
    jspb.load(UPS_PROTO, (err, root) => {
        if (err) {
            throw err;
        }
        try {
            let UConnected = root.lookupType('UConnected');
            let message = UConnected.decodeDelimited(data);
            if (message.result == 'connected!') {
                WORLD_ID = Number(message.worldid);
                console.log("Connected to world " + WORLD_ID);
            }
            console.log(message);
            resolve(message);
        } catch (err){
            let UResponses = root.lookupType('UResponses');
            let message = UResponses.decodeDelimited(data);
            console.log(message);
            resolve(message);
        }
    });
}
*/