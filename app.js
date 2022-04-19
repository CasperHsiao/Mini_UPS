import express from 'express';
import routes from './src/routes/main_route';
import mongoose from 'mongoose';
import jspb from 'protobufjs';
import net from 'net';

const app = express();
var path = require('path')

const SERVER_ERROR = 500;
const REQUEST_ERROR = 400;
const PORT_NUM = 8000;
const PORT = process.env.PORT || PORT_NUM;
const WORLD_URL = 'localhost';
const WORLD_PORT_NUM = 23456;
const upsProto = 'world_ups.proto';
var WORLD_ID = null;
const client = net.connect(WORLD_PORT_NUM, WORLD_URL);

// ejs view engine
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')


client.on('end', () => {
    console.log("Disconnected from world");
});

initializeWorld();

/*
// mongoose connection
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://127.0.0.1/UPSdb',{
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.catch(err => console.log( err ))
.then(() => console.log( 'Database Connected' ));
*/

//bodyparser setup
app.use(express.static("public"));
app.use(express.urlencoded({extended: true}));
app.use(express.json());

routes(app);

app.get('/query', async function (req, res) {
    // res.set("Content-Type", "application/json");
    let result = await query();
    res.type("json");
    res.send({ "result" : "ok" });
});

// app.get('/login', function (req, res) {
//     res.sendFile(__dirname + "/public/login.html");
//     // res.render(__dirname + "/public/login", {Title:"KKKK"});
// });

app.get('/world', async function (req, res) {
    try {
        //let result = await initializeWorld();
        //WORLD_ID = Number(result.worldid);
        res.json({"worldid" : WORLD_ID});
    } catch (err) {

    }
});


app.listen(PORT, () => {
    console.log("Listening on port " + PORT + "...");
});

async function query() {
    try {
        let root = await jspb.load(upsProto);
        let UCommands = root.lookupType('UCommands');
        let UResponses = root.lookupType('UResponses');
        let UQuery = root.lookupType('UQuery');
        let query = {truckid: 2, seqnum: 0};
        let errMsg = UQuery.verify(query);
        if (errMsg) {
            throw Error(errMsg);
        }
        let command = {queries: [query]};
        errMsg = UCommands.verify(command);
        if (errMsg) {
            throw Error(errMsg);
        }
        let request = UCommands.create(command);
        let buffer = UCommands.encodeDelimited(request).finish();
        client.write(buffer);
    } catch (err) {
        console.log(err);
    }
}

function handleUResponses(data) {
    jspb.load(upsProto, (err, root) => {
        if (err) {
            throw err;
        }
        let UResponses = root.lookupType('UResponses');
        let message = UResponses.decodeDelimited(data);
        console.log(message);
    });
}

async function initializeWorld() {
    try {
        let root = await jspb.load(upsProto);
        let UConnect = root.lookupType('UConnect');
        let UConnected = root.lookupType('UConnected');
        var UInitTruck = root.lookupType("UInitTruck");
        var UInitTruckPayload = { id: 2, x: 10, y: 1 };
        var errMsg = UInitTruck.verify(UInitTruckPayload);
        if (errMsg) {
            throw Error(errMsg);
        }
        let UConnectPayload = {trucks: [UInitTruckPayload], isAmazon: false};
        errMsg = UConnect.verify(UConnectPayload);
        if (errMsg) {
            throw Error(errMsg);
        }
        let request = UConnect.create(UConnectPayload);
        let buffer = UConnect.encodeDelimited(request).finish();
        client.write(buffer);

        let data = await new Promise((resolve, reject) => {
            client.on('data', (data) => {
                console.log("Data received from world");
                resolve(data);
            });
        });
        let response = UConnected.decodeDelimited(data);
        console.log(response.result);
        WORLD_ID = Number(response.worldid);
        client.on('data', (data) => {
            handleUResponses(data);
        });
    } catch (err) {
        console.log(err);
    }

}