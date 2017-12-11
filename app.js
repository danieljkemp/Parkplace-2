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
mongoose.connect("mongodb://localhost/parkplace", { useMongoClient: true });


app.set("view engine", "ejs");
app.use(body_parser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static("public"));

var firebaseConfig = {
    apiKey: config.firebase.apiKey,
    authDomain: config.firebase.authDomain,
    databaseURL: config.firebase.databaseURL,
    storageBucket: config.firebase.storageBucket,
};

firebase.initializeApp(firebaseConfig);

app.use(authRoute);
app.use(parkingspotRoute);
app.use(paymentRoute);

// function isLoggedIn(req,res,next){
//     firebase.auth().onAuthStateChanged(function(appuser) {
//         if (appuser) {
//             //if user is signed in
//             user.findOne({"email":firebase.auth().currentUser.email},function(err,foundUser){
//               if(err){
//                   console.log(err);
//               } 
//               else{
//                   next();
//               }
//             });
            
//         }
//         else {
//             // No user is signed in.
//             res.render("home", { user: null });
//         }
//     });
// }


app.get("/", function(req, res) {
    res.redirect("/home");
});

app.get("/home",function(req, res) {
    res.render("home");
    
});

app.get("/main", middleware.isAuthenticated,function(req, res) {
    var userEmail = req.user.email;
    user.find({ "email": userEmail }, function(err, foundUser) {
        if (err) {
            console.log(err);
        }
        else {
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




app.listen(process.env.PORT, process.env.IP, function() {
    console.log("Server started");
});