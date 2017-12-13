  var firebase = require("firebase");

/*
Middleware code to check if user is logged in.
This provides security by verifying user actions(requests), before
approprtiate routes are invoked.
*/
  module.exports = {
      isAuthenticated: function(req, res, next) {
          var user = firebase.auth().currentUser;
          if (user !== null) {
              req.user = user;
              next();
          }
          else {
              res.redirect('/home');
          }
      },
  }