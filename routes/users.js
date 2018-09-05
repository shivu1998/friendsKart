var express = require("express");
var router = express.Router();
var Camp = require("../models/campground");
var multer = require('multer');
var User = require("../models/user");
var nodemailer = require("nodemailer");
var compression = require('compression');
router.use(compression());
var async = require("async");

router.get("/you",function(req,res){
   
   
});




module.exports = router;