import express from 'express';
import routes from './src/routes/main_route';
import mongoose from 'mongoose';
import jspb from 'protobufjs';
import net from 'net';
import { addNewOrder, editPackageAddress, getPackageStatus } from './src/controllers/main_controller';
import { request } from 'http';
import { Mutex } from 'async-mutex'

const mutexTrack = new Mutex();
const mutexSeq = new Mutex();

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
const RECV_SEQ_MAP = {};
var Tracking_Number = 0;
var Sequence_Number = 0;


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

app.get('/worldid', async function (req, res) {
    res.send(JSON.stringify({"worldid" : WORLD_ID}));
});

async function getTrackingNumber() {
    const release = await mutexTrack.acquire();
    let result = Tracking_Number;
    Tracking_Number++;
    release();
    return result;
}

async function getSequenceNumber() {
    const release = await mutexSeq.acquire();
    let result = Sequence_Number;
    Sequence_Number++;
    release();
    return result;
}

app.post('/amazonEndpoint', async function (req, res) {
    let request = JSON.parse(req.body);
    if (request.startDelivery !== undefined ) {
        try {
            let trackingNumber = await getTrackingNumber();
            await addNewOrder(request, trackingNumber);
            res.send(JSON.stringify({"startDelivery": {"result": "ok", "trackingNumber": trackingNumber}}));
            let sequenceNumber = await getSequenceNumber();
            let pickup = {'type': 'pickup', 'whid': Number(request.startDelivery.warehouseID), 'packageid': trackingNumber, 'seqnum': sequenceNumber};
            let idleTruck = IDLE_TRUCKS.shift()
            if (idleTruck === undefined) {
                PICKUP_QUEUE.push(pickup);
            } else {
                pickup['truckid'] = idleTruck;
                PACKAGE_TRUCK_MAP[pickup.packageid] = idleTruck;
                sendRequestToWorld(pickup);
            }
        } catch (err) {
            res.status(REQUEST_ERROR).send(err.message);
        }
    } else if (request.deliveryStatus !== undefined) {
        let trackingNumber = request.deliveryStatus.trackingNumber;
        try {
            let result = await getPackageStatus(trackingNumber); 
            res.send(JSON.stringify({"deliveryStatus": {"status": result, "trackingNumber": trackingNumber}}));
        } catch (err) {
            res.status(REQUEST_ERROR).send(err.message);
        }
    } else if (request.editAddress !== undefined) {
        let trackingNumber = request.editAddress.trackingNumber;
        let newAddress = request.editAddress.address;
        try {
            let result = await editPackageAddress(trackingNumber, newAddress); // await check database 
            res.send(JSON.stringify({"deliveryStatus": {"status": result, "trackingNumber": trackingNumber}}));
        } catch (err) {
            res.status(REQUEST_ERROR).send(err.message);
        }
    } else if (request.cancelAddress !== undefined) {
        let trackingNumber = request.cancelAddress.trackingNumber;
        try {
            let result; // await check database 
            res.send(JSON.stringify({"deliveryStatus": {"status": result, "trackingNumber": trackingNumber}}));
        } catch (err) {
            res.status(REQUEST_ERROR).send(err.message);
        }
    } else if (request.truckLoaded !== undefined) {
        let trackingNumber = request.truckLoaded.trackingNumber;
    } else {
        res.status(REQUEST_ERROR).send("Invalid request: missing or invalid request type");
    }
});


function generatePickupPayload(command, root) {
    let UGoPickup = root.lookupType('UGoPickup');
    let pickupPayload = {'truckid': command.truckid, 'whid': command.whid, 'seqnum': command.seqnum};
    let errMsg = UGoPickup.verify(pickupPayload);
    if (errMsg) {
        throw Error(errMsg);
    }
    return pickupPayload;
}

function generateDeliverPayload(command, root) {
    let UGoDeliver = root.lookupType('UGoDeliver');
    let UDeliveryLocation = root.lookupType('UDeliveryLocation');
    let deliveryLocationPayload = {'packageid': command.packageid, 'x': command.x, 'y': command.y};
    let errMsg = UDeliveryLocation.verify(deliveryLocationPayload);
    if (errMsg) {
        throw Error(errMsg);
    }
    let deliverPayload = {'truckid': command.truckid, 'packages': [deliveryLocationPayload], 'seqnum': command.seqnum};
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
        WORLD_SIM_SERVER.write(buffer)
    });
}

function sendAckToWorld(ack) {
    jspb.load(UPS_PROTO, (err, root) => {
        if (err) {
            throw Error(err);
        }
        let UCommands = root.lookupType('UCommands');
        let commandPayload = {'acks': [ack]};
        let errMsg = UCommands.verify(commandPayload);
        if (errMsg) {
            throw Error(errMsg);
        }
        let message = UCommands.create(commandPayload);
        console.log(message);
        let buffer = UCommands.encodeDelimited(message).finish();
        WORLD_SIM_SERVER.write(buffer)
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
            console.log(message);
            handleUResponses(message);
        }
    });
}

function handleUResponses(response) {
    let completions = response.completions;
    let delivered = response.delivered;
    let error = response.error;
    let acks = response.acks;
    for (let i = 0; i < acks.length; i++) {
        // for each ack stop sending the corresonping seqnum Ucommands
    }
    for (let i = 0; i < completions.length; i++) {
        handleFinishedTruck(completions[i]);
    }
    for (let i = 0; i < delivered.length; i++) {
        handleDeliveredPackage(delivered[i]);   
    }
    for (let i = 0; i < error.length; i++) {
        handleError(error[i]);   
    }
}

function handleError(error) {
    let errMsg = error.err;
    let seqnum = error.seqnum;
    sendAckToWorld(seqnum);
    if (RECV_SEQ_MAP[seqnum] === undefined) {
        console.log(errMsg);
    }
}

function handleDeliveredPackage(delivered) {    
    let trackingNumber = delivered.packageid;
    let seqnum = delivered.seqnum;
    sendAckToWorld(seqnum);
    if (RECV_SEQ_MAP[seqnum] === undefined) {
        RECV_SEQ_MAP[seqnum] = true;
        // request amazon
        // update database to delivered
    }
}

function handleFinishedTruck(finished) {
    let status = finished.status;
    let seqnum = finished.seqnum;
    let truckid = finished.truckid;
    sendAckToWorld(seqnum);
    if (RECV_SEQ_MAP[seqnum] === undefined) {
        RECV_SEQ_MAP[seqnum] = true;
        if (status === 'IDLE') {
            let pickup = PICKUP_QUEUE.shift();
            if (pickup === undefined) {
                IDLE_TRUCKS.push(truckid);
            } else {
                pickup['truckid'] = truckid;
                PACKAGE_TRUCK_MAP[pickup.packageid] = truckid;
                sendRequestToWorld(pickup);
            }
        } else if (status === 'ARRIVE WAREHOUSE') {
            // request amazon
        }
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