/*************************************************************************************
* 3D Imagineer
* Full-stack e-commerce store for 3D models.
* Node.js + Express + MongoDB + EJS, with a two-tier product recommendation engine.
**************************************************************************************/

const path = require("path");
const express = require("express");
const expresslayouts = require('express-ejs-layouts');
const app = express();
const { get } = require("http");
const { error } = require("console");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const fileUpload = require('express-fileupload');

//Set up dotenv
const dotenv = require ("dotenv");
dotenv.config({path: "./config/.env"});

//Set up body-parser
app.use(express.urlencoded({extended: true}));

// Set up express-fileupload.
app.use(fileUpload());

// Set up express-session.
//
// Sessions are stored in MongoDB rather than in the default MemoryStore. In a
// serverless deployment each request can be served by a different instance, so a
// session held in one instance's memory is invisible to the next request and the
// user appears to be logged out mid-flow. A shared store fixes that, and it also
// survives restarts and redeploys.
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_CONNECTION_STRING,
        collectionName: "sessions",
        ttl: 60 * 60 * 24 // expire after a day, cleaned up by Mongo
    })
}));

app.use((req, res, next) => {
    // Save the user to the global EJS varialbe "user".
    res.locals.user = req.session.user;
    next();
});


//Set up EJS
//app.set('views', path.join(__dirname, '/views'));
app.set('view engine','ejs');
app.set('layout','layout/main');
app.set('views',path.join(__dirname,'/views'));
app.use(expresslayouts);

app.use(express.static(path.join(__dirname, "assets")));

// Add your routes here
// e.g. app.get() { ... }

//Load the controller into express
const generalController = require("./controllers/generalController");
const inventoryController = require("./controllers/inventoryController");
const loadDataController = require('./controllers/loadDataController');

//Middleware
app.use("/", generalController);
app.use("/inventory", inventoryController);
app.use('/load-data', loadDataController);

// This use() will not allow requests to go beyond it
// so we place it at the end of the file, after the other routes.
// This function will catch all other requests that don't match
// any other route handlers declared before it.
// This means we can use it as a sort of 'catch all' when no route match is found.
// We use this function to handle 404 requests to pages that are not found.
app.use((req, res) => {
    res.status(404).send("Page Not Found");
});

// This use() will add an error handler function to
// catch all errors.
app.use(function (err, req, res, next) {
    console.error(err.stack)
    res.status(500).send("Something broke!")
});


// *** DO NOT MODIFY THE LINES BELOW ***

// Define a port to listen to requests on.
const HTTP_PORT = process.env.PORT || 8080;

// Call this function after the http server starts listening for requests.
function onHttpStart() {
    console.log("Express http server listening on: " + HTTP_PORT);
}
  
// Listen on port 8080. The default port for http is 80, https is 443. We use 8080 here
// because sometimes port 80 is in use by other applications on the machine

//CONNECT TO MONGODB
mongoose.connect(process.env.MONGODB_CONNECTION_STRING)
.then(()=>{
    console.log("Connected to the MongoDB");
    app.listen(HTTP_PORT, onHttpStart);
})
.catch(err=>{
    console.log("Cant' connect to the MongoDB", + err);
})
