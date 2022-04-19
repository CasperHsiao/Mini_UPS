import express from 'express';
import routes from './src/routes/main_route';
import mongoose from 'mongoose';

const app = express();
var path = require('path')

const SERVER_ERROR = 500;
const REQUEST_ERROR = 400;
const PORT_NUM = 8000;
const PORT = process.env.PORT || PORT_NUM;

// ejs view engine
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')


// mongoose connection
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://127.0.0.1/UPSdb',{
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.catch(err => console.log( err ))
.then(() => console.log( 'Database Connected' ));


//bodyparser setup
app.use(express.static("public"));
app.use(express.urlencoded({extended: true}));
app.use(express.json());

routes(app);

// app.get('/', function (req, res) {
//     res.render(__dirname + "/public/login.html", {Title:"KKKK"});
// });

// app.get('/login', function (req, res) {
//     res.sendFile(__dirname + "/public/login.html");
//     // res.render(__dirname + "/public/login", {Title:"KKKK"});
// });

// app.get('/hello', function (req, res) {
//     // res.set("Content-Type", "application/json");
//     res.type("json");
//     res.send({ "msg" : "Hello" });
// });


// app.get('/world', function (req, res) {
//     res.json({ "msg" : "World!"});
// });


app.listen(PORT, () => {
    console.log("Listening on port " + PORT + "...");
});
