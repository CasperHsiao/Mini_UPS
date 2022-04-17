"use strict";

const express = require("express");
const app = express();

app.use(express.static("public"));
app.use(express.urlencoded({extended: true}));
app.use(express.json());

const SERVER_ERROR = 500;
const REQUEST_ERROR = 400;
const PORT_NUM = 8000;
const PORT = process.env.PORT || PORT_NUM;

app.get('/hello', function (req, res) {
  // res.set("Content-Type", "application/json");
  res.type("json");
  res.send({ "msg" : "Hello" });
});


app.get('/world', function (req, res) {
    res.json({ "msg" : "World!"});
});


app.listen(PORT, () => {
    console.log("Listening on port " + PORT + "...");
});
