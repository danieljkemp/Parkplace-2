var express = require("express");
var firebase = require("firebase");
var user = require("../models/user");
var parkingspot = require("../models/parkingspot");
var geocoder = require("geocoder");
var middleware=require("../middleware/index");
var router = express.Router();
var multer = require('multer');

/*
Initialize multer configuration object for image uploading and fetching.
The storage object provides control over storage path, and also to
modify file names and add extensions.By default, multer does not retain file
extensions.
*/
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, '/home/ubuntu/workspace/public/images/uploads');
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + file.originalname);
    }

});

var upload = multer({ storage: storage });



//Renders the publish page for publishing parking spots
router.get("/parkingspot/new",middleware.isAuthenticated, function(req, res) {
    var userEmail = req.user.email
    user.find({ "email": userEmail }, function(err, foundUser) {
        if (err) {
            console.log(err);
        }
        else {
            res.render("publishspot", { user: foundUser[0] });
        }
    });

});

//Displays the list of all parking spots booked by a user
router.get("/parkingspot/booking/bookedspots", middleware.isAuthenticated,function(req, res) {
    var userEmail = req.user.email;
    user.find({ "email": userEmail }, function(err, foundUser) {
        if (err) {
            console.log(err);
        }
        else {
            parkingspot.find({
                "booking": {
                    "booked": true,
                    "bookingmail": userEmail
                }
            }, function(err, foundSpots) {
                if (err) {
                    console.log(err);
                }
                else {
                    console.log("FoundUser "+foundUser);
                    res.render("bookedspots", { user: foundUser[0], parkingspots: foundSpots });
                }
            });
        }
    });
});

//Save parking spot data to database
router.post("/parkingspot", middleware.isAuthenticated, upload.single('photo'), function(req, res) {
    var author = {};
    var address1 = req.body.address1;
    var address2 = req.body.address2;
    var fulladdress = address1;
    var city = req.body.city;
    var state = req.body.state;
    var zip = req.body.zip;
    var phone = req.body.phone;
    var enteredEmail = req.body.enteredEmail;
    var date = req.body.date;
    var imageName = req.file.filename;
    var numSpots = req.body.numSpots;
    var price = req.body.price;
    var userEmail = firebase.auth().currentUser.email;
    user.find({ "email": userEmail }, function(err, foundUser) {
        if (err) {
            console.log(err);
        }
        else {
            author = {
                id: foundUser[0]._id,
                name: foundUser[0].firstname
            }
            /*
            Geocoder object maps street addresses to corresponding 
            lattitude and longitude pairs
            */
            geocoder.geocode(fulladdress, function(err, data) {
                if (err) {
                    console.log(err);
                }
                else {
                    var lat = data.results[0].geometry.location.lat;
                    var lng = data.results[0].geometry.location.lng;
                    var location = data.results[0].formatted_address;
                    //Cretae new parking spot object
                    var newParkingSpot = {
                        author: author,
                        firstname: foundUser[0].firstname,
                        lastname: foundUser[0].lastname,
                        address1: address1,
                        address2: address2,
                        city: city,
                        state: state,
                        zip: zip,
                        phone: phone,
                        email: enteredEmail,
                        date: date,
                        location: location,
                        loc: {
                            type: "Point",
                            coordinates: [lng, lat]
                        },
                        lat: lat,
                        lng: lng,
                        numberOfSpots: numSpots,
                        price: price,
                        image: imageName
                    };
                    // Create a new campground and save to DB
                    parkingspot.create(newParkingSpot, function(err, newlyCreated) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            res.redirect("/parkingspot/publisher/" + foundUser[0]._id);
                        }
                    });
                }
            });
        }
    });
});



//Show all parking spots published by user
router.get("/parkingspot/publisher/:id", middleware.isAuthenticated, function(req, res) {
    var id = req.params.id;
    user.findById(id, function(err, foundUser) {
        if (err) {
            console.log(err);
        }
        else {
            parkingspot.find({ author: { "id": foundUser._id, "name": foundUser.firstname } }, function(err, foundSpots) {
                if (err) {
                    console.log(err);
                }
                else {
                    res.render("userpublishedspots", { user: foundUser, parkingspots: foundSpots });
                }
            });
        }
    });

});


//Show specific parking spot.
//This route is invoked when a user wants to view a specific parking spot
router.get("/parkingspot/:id",middleware.isAuthenticated, function(req, res) {
    var id = req.params.id;
    var userEmail = req.user.email;
    user.find({ "email": userEmail }, function(err, foundUser) {
        if (err) {
            console.log(err);
        }
        else {
            parkingspot.findById(req.params.id, function(err, foundParkingSpot) {
                if (err) {
                    console.log("Could not display parkingspot page");
                }
                else {
                    res.render("viewspot", { user: foundUser[0], parkingspot: foundParkingSpot });
                }
            });
        }
    });
});


/*
This route is invoked when a user wants to edit a parking spot.
The user can only edit parking spots owned by him/her.
*/
router.get("/parkingspot/:id/edit", middleware.isAuthenticated,function(req, res) {
    var userEmail = req.user.email;
    user.find({ "email": userEmail }, function(err, foundUser) {
        if (err) {
            console.log(err);
        }
        else {
            parkingspot.findById(req.params.id, function(err, foundParkingSpot) {
                if (err) {
                    console.log(err);
                }
                else {
                    res.render("editspot", { user: foundUser, parkingspot: foundParkingSpot });
                }
            });
        }
    });
});



//Update ParkingSpot  route
router.put("/parkingspot/:id", middleware.isAuthenticated, function(req, res) {
    var fulladdress = req.body.address1.concat(req.body.address2);
    geocoder.geocode(fulladdress, function(err, data) {
        if (err) {
            console.log(err);
        }
        else {
            var lat = data.results[0].geometry.location.lat;
            var lng = data.results[0].geometry.location.lng;
            var location = data.results[0].formatted_address;
            //Create new parking spot object based on new form entries submitted by user
            var newData = {
                address1: req.body.address1,
                address2: req.body.address2,
                city: req.body.city,
                state: req.body.state,
                zip: req.body.zip,
                phone: req.body.phone,
                email: req.body.enteredEmail,
                date: req.body.date,
                image: req.body.image,
                location: location,
                loc: {
                    type: "Point",
                    coordinates: [lng, lat]
                },
                lat: lat,
                lng: lng,
                numberOfSpots: req.body.numSpots,
                price: req.body.price
            };
            parkingspot.findByIdAndUpdate(req.params.id, { $set: newData }, function(err, updatedSpot) {
                if (err) {
                    console.log(err);
                }
                else {
                    res.redirect("/parkingspot/" + updatedSpot._id);
                }
            });
        }
    });
});


//Delete Parking Spot
//The parking spot can only be deleted by its owner
router.delete("/parkingspot/:id",middleware.isAuthenticated, function(req, res) {
    var id = req.params.id;
    var userEmail = req.user.email;
    user.find({ "email": userEmail }, function(err, foundUser) {
        if (err) {
            console.log(err);
        }
        else {
            parkingspot.findByIdAndRemove(id, function(err) {
                if (err) {
                    console.log(err);
                }
                else {
                    res.redirect("/parkingspot/publisher/" + foundUser[0]._id);
                }
            });
        }
    });
});


//Search for parking spots
router.post("/parkingspot/search", middleware.isAuthenticated, function(req, res) {
    var email = req.user.email;
    var address = req.body.searchaddress;
    user.find({ "email": email }, function(err, foundUser) {
        if (err) {
            console.log(err);
        }
        else {
            /*
            Geocoder object maps street addresses to corresponding 
            lattitude and longitude pairs
            */
            geocoder.geocode(address, function(err, data) {
                if (err) {
                    console.log(err);
                }
                else {
                    var lat = data.results[0].geometry.location.lat;
                    var lng = data.results[0].geometry.location.lng;
                    //Geo-spatial operators are used to fetch parking spots within 3KM radius
                    parkingspot.find({
                        loc: {
                            $near: {
                                $geometry: {
                                    type: "Point",
                                    coordinates: [lng, lat]
                                },
                                $maxDistance: 3000
                            }
                        }
                    }).limit(10).exec(function(err, locations) {
                        if (err) {
                            return res.json(500, err);
                        }

                        res.render("searchresults", { parkingspots: locations, user: foundUser[0] });
                    });
                }
            });
        }
    });
});



module.exports = router;