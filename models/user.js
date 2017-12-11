var mongoose = require("mongoose");

var UserSchema = new mongoose.Schema({
   firstname: String,
   lastname: String,
   birthdate: Date,
   address: String,
   city: String,
   state: String,
   email: String
});

module.exports = mongoose.model("user", UserSchema);