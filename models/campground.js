
var mongoose = require("mongoose");

var campGroundSchema = new mongoose.Schema({
   name:String,
   image:String,
   imageId:String,
   description:String,
   sale:Boolean,
   date:{type:Date,default:Date.now},
   requestedBy:String,
   sold:{type:Boolean,default:false},
   recieved:{type:Boolean,default:false},
   agree :{type:Boolean,default:false},
   money:{type:Boolean,default:false},
   price:String,
   author:{
      id:{
         type:mongoose.Schema.Types.ObjectId,
         ref:"User"
      },
      username:String
   },
   comments:[
      {
         type:mongoose.Schema.Types.ObjectId,
         ref:"Comment"
      }]
});

module.exports = mongoose.model("Camp",campGroundSchema);
