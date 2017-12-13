var express = require("express");
var paypal = require("paypal-rest-sdk");
var firebase = require("firebase");
var parkingspot = require("../models/parkingspot");
var nodemailer = require("nodemailer");
var middleware=require("../middleware/index");
var config=require("../configuration/config");
var user = require("../models/user");
var router = express.Router();

/*
Paypal configuration object.
The client id and secret values are registered to the merchant account.
Payments made for parking spots are transferred to the merchant account.
*/
paypal.configure({
    'mode': config.paypal.mode, //sandbox or live
    'client_id':config.paypal.clientId, 
    'client_secret': config.paypal.client_secret
});


//Payment initiation route.
router.get('/parkingspot/payment/:id', middleware.isAuthenticated, (req, res) => {
    var id = req.params.id;
    parkingspot.findById(id, function(err, foundSpot) {
        if (err) {
            console.log(err);
        }
        else {
            //User is redirected to the return url once payment is done
            var return_url = "https://parkplace-rvijayde.c9users.io/parkingspot/payment/success/".concat(foundSpot._id);
            //User is redirected to the payment cancellation route, if payment is cancelled
            var cancel_url = "https://parkplace-rvijayde.c9users.io/parkingspot/payment/cancel";
            var price = foundSpot["price"].toString();
            //Payment object for representing the transaction
            var create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": return_url,
                    "cancel_url": cancel_url
                },
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": "ParkingSpot",
                            "sku": "ParkingSpotBooking",
                            "price": price,
                            "currency": "USD",
                            "quantity": "1"
                        }]
                    },
                    "amount": {
                        "currency": "USD",
                        "total": price
                    },
                    "description": "Booking parking spot at address: ".concat(foundSpot.address1.concat(parkingspot.address2))
                }]
            };

            //Initiate payment.The payment object is sent to paypal's transaction recorder
            paypal.payment.create(create_payment_json, function(error, payment) {
                if (error) {
                    console.log("ERROR::");
                    console.log(error);
                }
                else {
                    //The user is takent to the payment page only after validating the payment object 
                    for (let i = 0; i < payment.links.length; i++) {
                        if (payment.links[i].rel === 'approval_url') {
                            res.redirect(payment.links[i].href);
                        }
                    }

                }
            });
        }
    });

});

/*
Payment success route.
Request object contains payment information such as payer id and payment id 
for uniquely identifying the transaction
*/
router.get('/parkingspot/payment/success/:id', (req, res) => {
    const spotId = req.params.id;
    const payerId = req.query.PayerID;
    const paymentId = req.query.paymentId;
    const userEmail = firebase.auth().currentUser.email;
    parkingspot.findById(spotId, function(err, foundSpot) {
        if (err) {
            console.log(err);
        }
        else {
            const execute_payment_json = {
                "payer_id": payerId,
                "transactions": [{
                    "amount": {
                        "currency": "USD",
                        "total": foundSpot.price
                    }
                }]
            };

            paypal.payment.execute(paymentId, execute_payment_json, function(error, payment) {
                if (error) {
                    console.log(error.response);
                    throw error;
                }
                else {
                    /*
                    Update parking spot information to reflect booking status
                    This is to make sure that the spot doesnt appear either in the search list or suggestion
                    list until the claim is released
                    */
                    var booking = { "booking": { "bookingmail": userEmail, "booked": true } };
                    parkingspot.findByIdAndUpdate(foundSpot._id, {
                        $set: booking
                    }, function(err, updatedSpot) {
                        if (err) {
                            console.log(err);
                        }
                        else {
                            user.find({ "email": userEmail }, function(err, foundUser) {
                                if (err) {
                                    console.log("Could not find user");
                                }
                                else {
                                    var mailAddress = foundSpot.address1 + foundSpot.address2 + foundSpot.city + foundSpot.state + foundSpot.zip;
                                    //Nodemailer transport object is configured with merchant account email address and password
                                    let transporter = nodemailer.createTransport({
                                        service: "Gmail",
                                        auth: {
                                            user: config.nodemail.email,
                                            pass: config.nodemail.pass
                                        }
                                    });

                                    //setup email data with unicode symbols
                                    //Mail object for driver
                                    var mailToDriver = {
                                        from: 'rahul.lionelmessi@gmail.com', // sender address
                                        to: userEmail, // list of receivers
                                        subject: 'Booking confirmation from Parkplace', // Subject line
                                        text: 'You have succesfully made a booking', // plain text body
                                        html: `<b>You have succesfully made a booking on Parkingplace</b>
                                 <p>Booking details for your reference:</p>
                                 <p>--------------------------------------</p>
                                 <p>Booking Id: ` + paymentId + `</p>
                                 <p>Address: ` + mailAddress + `</p>
                                  <p>Contact Name:` + foundSpot.author.name + `</p>
                                 <p>Contact Name:` + foundSpot.author.email + `</p>` // html body
                                    };
                                    
                                    //Mail object for owner
                                    var mailToOwner = {
                                        from: 'rahul.lionelmessi@gmail.com', // sender address
                                        to: userEmail, // list of receivers
                                        subject: 'Booking confirmation from Parkplace', // Subject line
                                        text: 'A booking has been confirmed for your parking spot', // plain text body
                                        html: `<b>A booking has been confirmed for your parking spot</b>
                                                 <p>Booking details for your reference:</p>
                                                 <p>--------------------------------------</p>
                                                 <p>Booking Id: ` + paymentId + `</p>
                                                 <p>Address: ` + mailAddress + `</p>
                                                 <p>Contact Email:` + userEmail + `</p>
                                                 <p>Contact Firstname:` + foundUser[0].firstname + `</p>
                                                 <p>Contact Lastname:` + foundUser[0].lastname + `</p>`// html body
                                    };

                                    console.log(mailToDriver);
                                    console.log(mailToOwner);

                                    // send mail with defined transport object
                                    transporter.sendMail(mailToDriver, (error, info) => {
                                        if (error) {
                                            return console.log(error);
                                        }
                                        console.log('Message sent: %s', info.messageId);
                                    });

                                    transporter.sendMail(mailToOwner, (error, info) => {
                                        if (error) {
                                            return console.log(error);
                                        }
                                        console.log('Message sent: %s', info.messageId);
                                        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
                                    });
                                    res.redirect("/main");
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

//Payment cancellation route
router.get('/parkingspot/payment/cancel', (req, res) => res.send('Cancelled'));

module.exports = router;