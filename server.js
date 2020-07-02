var express = require("express");
const bodyParser = require("body-parser");
var app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(function (req, res, next) {
 // Website you wish to allow to connect
 res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8100');

 // Request methods you wish to allow
 res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

 // Request headers you wish to allow
 res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

 // Set to true if you need the website to include cookies in the requests sent
 // to the API (e.g. in case you use sessions)
 res.setHeader('Access-Control-Allow-Credentials', true);

 next();
})

app.get("/", function (req, res) {
    res.send("test123");
})
 
app.post("/", function (req, res) {
    res.send("test");
    // res.send(`Length: ${req.body.x}`);
    // console.log(req.body);
});

app.listen(8080, "localhost");
console.log("Server is Listening on port 8080");