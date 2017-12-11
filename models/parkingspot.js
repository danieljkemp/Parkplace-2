var mongoose = require("mongoose");
mongoose.Promise = global.Promise;


var parkingspotSchema = new mongoose.Schema({
   author: {
      id: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "user"
      },
      name: String
   },
   booking: {
      bookingmail:{type:String,default:""},
      booked: {type:Boolean,default:false}
   },
   firstname: String,
   lastname: String,
   address1: String,
   address2: String,
   city: String,
   state: String,
   zip: String,
   phone: Number,
   email: String,
   // image: { data: Buffer, contentType: String },
   image: String,
   date: Date,
   location: String,
   loc: {
      type: {},
      coordinates: [Number]
   },
   lat: Number,
   lng: Number,
   numberOfSpots: Number,
   price: Number,
});

parkingspotSchema.index({ loc: '2dsphere' });
var parkingspot = mongoose.model("parkingspot", parkingspotSchema);

module.exports = parkingspot;