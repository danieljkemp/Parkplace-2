var express = require("express");
var app = express();
var body_parser = require("body-parser");
var firebase = require('firebase');
require('firebase/auth');
require('firebase/database');
var middleware=require("./middleware/index");
var mongoose = require("mongoose");
var nodemailer = require('nodemailer');
var methodOverride = require("method-override");
var authRoute = require("./routes/authroutes");
var parkingspotRoute = require("./routes/parkingspotroutes");
var paymentRoute = require("./routes/paymentroutes");
var user = require("./models/user");
var parkingspot = require("./models/parkingspot");
var config=require("./configuration/config");
mongoose.Promise = global.Promise;
//Connect to parkplace database
mongoose.connect("mongodb://localhost/parkplace", { useMongoClient: true });


app.set("view engine", "ejs");
app.use(body_parser.urlencoded({ extended: true}));
//method override is used to handle HTTP requests in addition to typical GET and POST requests
app.use(methodOverride("_method"));
app.use(express.static("public"));

//Firebase configuration object
var firebaseConfig = {
    apiKey: config.firebase.apiKey,
    authDomain: config.firebase.authDomain,
    databaseURL: config.firebase.databaseURL,
    storageBucket: config.firebase.storageBucket,
};

firebase.initializeApp(firebaseConfig);

//Expose authentication,parking spot and payment routes to express
app.use(authRoute);
app.use(parkingspotRoute);
app.use(paymentRoute);


app.get("/", function(req, res) {
    res.redirect("/home");
});

app.get("/home",function(req, res) {
    res.render("home");
});


/*
Main page route.
This route is invoked once the user logs in
*/
app.get("/main", middleware.isAuthenticated,function(req, res) {
    var userEmail = req.user.email;
    user.find({ "email": userEmail }, function(err, foundUser) {
        if (err) {
            console.log(err);
        }
        else {
            //Limiting the number of parking spots to be displayed on the main page
            parkingspot.find({}).limit(150).exec(function(err, foundspots) {
                if (err) {
                    console.log(err);
                }
                else {
                    res.render("mainpage", { user: foundUser[0], parkingspots: foundspots });
                }
            });
        }
    });
});



/*
Start server.C9 assigns IP address of the server and port
that the remote workspace is configured with
*/

app.listen(process.env.PORT, process.env.IP, function() {
    console.log("Server started");
});