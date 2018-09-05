require('dotenv').config();
var express = require("express");
var router = express.Router();
var Camp = require("../models/campground");
var multer = require('multer');
var User = require("../models/user");
var nodemailer = require("nodemailer");
var compression = require('compression');
router.use(compression());
// var async = require("async");

//  var mysql      = require('mysql');

// var db_config = {
   
//     host:"localhost",
//     user : "shivu",
//     password : "password",
//     database :"c9",
//     dbport : 3306
  
// };

// var connection;


// function handleDisconnect() {
//   connection = mysql.createConnection(db_config); // Recreate the connection, since
//                                                   // the old one cannot be reused.

//   connection.connect(function(err) {              // The server is either down
//     if(err) {                                     // or restarting (takes a while sometimes).
//       console.log('error when connecting to db:', err);
//       setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
//     }                                     // to avoid a hot loop, and to allow our node script to
//   });   
//     connection.query('SELECT * from login', function (error, results, fields) {
//   if (error) throw error;
//   console.log('The solution is: ', results);
  
// });
 
// connection.end();  
//   // process asynchronous requests in the meantime.
//                                           // If you're also serving http, display a 503 error.
//   connection.on('error', function(err) {
//     console.log('db error', err);
//     if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
//       handleDisconnect();                         // lost due to either server restart, or a
//     } else {                                      // connnection idle timeout (the wait_timeout
//       throw err;                                  // server variable configures this)
//     }
//   });
// }

// handleDisconnect();



var stats={
    productsInSale:0,
    productsSold:0
};

var storage = multer.diskStorage({
    
  filename: function(req, file, callback) {
  
      console.log("inside storage"+file);
      
    callback(null, Date.now() + file.originalname);
     
  }
   
});
var imageFilter = function (req, file, cb) {
    
   console.log("inside imageFilter");
 console.log(file);
  // upload file to S3

    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, imageFilter:imageFilter});

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'shivucloud', 
  api_key: process.env.api_key, 
  api_secret: process.env.api_secret
});

router.get("/upload",function(req,res)
{
    Camp.find({},function(err,camps)
    {
        if(err)
        {
            console.log("Error!!!");
        }
        else{
            res.render("campgrounds/upload.ejs");
        }
        
    });
  
});



router.get("/campgrounds",function(req,res)
{
    if(req.query.search)
    {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
          Camp.find({name:regex},function(err,camps)
    {
        if(err)
        {
            console.log("Error!!!");
        }
        else{
            if(camps.length < 1)
            {
                req.flash("error","Your search "+req.query.search+" didn't match any of our products");
                return res.redirect("/campgrounds");
                
            }else{
            res.render("campgrounds/search.ejs",{camps:camps,key:req.query.search});
            }
        }
        
    }).sort({"_id":-1});
  
        
    }else{
          Camp.find({},function(err,camps)
    {
        if(err)
        {
            console.log("Error!!!");
        }
        else{
            res.render("campgrounds/index.ejs",{camps:camps});
        }
        
    }).sort({"_id":-1});
  
    }
    
  
});
router.get("/refreshindex",function(req,res)
{
    Camp.find({},function(err, camps) {
       
       if(err)
       {
           req.flash("error",err.message);
           res.redirect("/campgrounds");
       }
       else
       {
           req.flash("error","Sorry, product request was cancelled by the user");
           res.render("campgrounds/heart2.ejs",{camps:camps});
       }
    });
    
});




router.get("/getproducts",function(req,res)
{
    Camp.find({},function(err, camps) {
       
       if(err)
       {
           req.flash("error",err.message);
           res.redirect("/campgrounds");
       }
       else
       {
           res.render("campgrounds/heart.ejs",{camps:camps});
       }
    }).sort({"_id":-1});
    
});
router.get("/campgrounds/info/:id",function(req,res)
{
    Camp.findById(req.params.id,function(err,camp)
    {
        if(err)
        {
            console.log("Error!!!");
        }
        else{
            res.send(camp);
        }
        
    });
  
});

router.post("/resize",upload.single("image"),function(req, res) {
  
   console.log(req.file);
   
     
   
   
   
});

router.post("/campgrounds",isLoggedIn,upload.single("image"),async (req,res) =>
{

 
 
    await cloudinary.v2.uploader.upload(req.file.path,{crop: "thumb", width:442, height: 350,quality:"auto",fetch_format:"auto",flags:"lossy" },async (err,result) =>{
        console.log("in");
        if(err)
        {
            req.flash("error",err.message);
            return res.redirect("back");
        }
           
       
    req.body.camp.image = result.secure_url;
    req.body.camp.imageId = result.public_id;
    req.body.camp.sale=true;
    req.body.camp.name = req.body.camp.campSiteName;
    req.body.camp.author={
        id:req.user._id,
        username:req.user.username
    };
   
await   Camp.create(req.body.camp,function(err,camp)
    { console.log("camp");
        if(err)
        {
            req.flash("error",err.message);
            return res.redirect("back");
        }
       
         res.redirect("/campgrounds");
        
    });
    
    });
    
 
    
});


   
router.get("/campgrounds/new",isLoggedIn,function(req, res) {
    res.render("campgrounds/new.ejs");
});

router.get("/campgrounds/:id",isLoggedIn,function(req,res)
{
    var campId = req.params.id;
    
    Camp.findById(campId).populate("comments").exec(function(err,camp)
    {
        if(err)
        {
           req.flash("error","Product not found");
           res.redirect("/campgrounds");
        }
        else
        {
            if(req.user){
              if ((!camp || !camp.sale) && !req.user.isAdmin) {
                  req.flash("error","sorry for the inconvienence, product not available right now ");
                  return res.redirect("/campgrounds");
            }
            }
            if(camp)
            res.render("campgrounds/show.ejs",{camp:camp,nanu:req.user});
            else{
                  req.flash("error","sorry for the inconvienence, product not available right now ");
                  res.redirect("/campgrounds");
            }
        }
        
    });
  
});

router.get("/campgrounds/:id/edit",myCampground,function(req, res) {
    
    if(req.isAuthenticated)
    {
        
        Camp.findById(req.params.id,function(err,camp)
   {
       
       if(err)
       {
           res.redirect("/campgrounds");
       }
       else
       {
          //camp.author.id is an object but req.user._id is a string
           if(camp.sale){
            res.render("campgrounds/edit.ejs",{camp:camp});
           }else
           {
               req.flash("error","Sorry product not available to edit");
               res.redirect("/campgrounds");
           }
           
       }
   });
    }
    else{
        
        res.send("You are not looged in!!!!");
        
    }
   
   
   
  
    
});

function myCampground(req,res,next)
{
   
    if(req.isAuthenticated())
    {
        Camp.findById(req.params.id,function(err, camp) {
            if(err)
            {
                req.flash("error","Product not found");
                res.redirect("/campgrounds");
            }
            else
            {
                if(!camp)
                {
                     req.flash("error", "Item not found.");
                     return res.redirect("/campgrounds");
                }
                if(camp.author.id.equals(req.user._id))
                {
                    next();
                }
                else
                {
                    req.flash("error","You are not permitted to do that!!!");
                    res.redirect("/campgrounds/"+req.params);
                }
            }
        });
    }
    else
    {
         req.flash("error","LogIn and be part of our community!!!");
        res.redirect("back");
    }
}



router.put("/campgrounds/:id",isLoggedIn,upload.single("image"), function(req,res){
    Camp.findById(req.params.id, async function(err,camp){
        if(err)
        {
            req.flash("error",err.message);
            res.redirect("/campgrounds/"+req.params.id+"/edit");
        }
        else
        {
            if(req.file){
                try{
                     await cloudinary.v2.uploader.destroy(camp.imageId);
                     var result = await cloudinary.v2.uploader.upload(req.file.path,{crop: "scale", width:442, height: 350,quality:"auto",fetch_format:"auto",flags:"lossy" });
                     camp.imageId=result.public_id;
                     camp.image=result.secure_url;
             
                }
                catch(err){
                    
                     req.flash("error",err.message);
                     return res.redirect("back");
                    
                }
         
    }
          camp.name = req.body.camp.campSiteName;
          camp.description = req.body.camp.description;
          camp.price=req.body.camp.price;
          camp.save();
          req.flash("success","Successfully updated!!!");
          res.redirect("/campgrounds/"+camp._id);
        }
        
    } );
    
    
});

router.get("/campgrounds/buy/:id",isLoggedIn,function(req, res) {
   if(req.user.verified){
        Camp.findById(req.params.id,function(err,camp)
   {
       if(camp){
           if(err || !camp.sale)
       {
           req.flash("error","Sorry your request couldn't be fulfilled");
           res.redirect("/campgrounds");
           
       }
       else
       {
           camp.sale=false;
           camp.sold = false;
           camp.requestedBy = req.user._id;
           User.findById(camp.author.id,function(err, user) {
                User.findById(camp.requestedBy,function(err, buyer) {
                          if(err)
               {
                   req.flash("error",err.message);
                   return res.redirect("/campgrounds");
               }
              
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail', 
                    auth: {
                      user: 'friendskarttech@gmail.com',
                      pass:  process.env.gmail_pw
                    }
      });
      var mailOptions = {
        to: user.email,
        from: 'friendskarttech@gmail.com',
        subject: 'Your product '+camp.name+" is requested by "+ buyer.profileName ,
        text: 'You are receiving this because someone  have requested your product.\n\n' +
          'Please click on the following link,to find out more in your profile \n\n'+
          "https://friendskart-shivu1998.c9users.io/campgrounds/user/"+camp.author.id
      };
      smtpTransport.sendMail(mailOptions, function(err) {
          if(err)
          {
              req.flash("error","Failed to send a mail to seller");
              return res.redirect("/campgrounds");
          }
        console.log('mail sent');
       
       
      });
                    
                })
      
         
               
           });
           camp.save();
             req.flash('success', 'Your request is being processed and and e-mail has been sent to seller . Processing may take few minutes ');
           res.redirect("/mykart")
       }
       }
       else
       {
           req.flash("error","Product not available");
           return res.redirect("/campgrounds");
       }
       
       
   });
   
   }else
   {
       req.flash("error","Your account is still not verfied for the email, "+req.user.email+"click to resend the verification email <a href=/resend> "+"click here");
        
       res.redirect("/campgrounds");
   }
  
    
});
router.get("/mykart/refresh",isLoggedIn,function(req, res) {
   
   Camp.find({requestedBy:req.user._id},function(err, camps) {
       if(err)
       {
           console.log("no requested");
       }
       else
       {
            res.render("campgrounds/mykart2.ejs",{camps:camps});
                
       }
   })
  
    
});
router.get("/mykart",isLoggedIn,function(req, res) {
   
   Camp.find({requestedBy:req.user._id},function(err, camps) {
       if(err)
       {
           console.log("no requested");
       }
       else
       {
            res.render("campgrounds/mykart.ejs",{camps:camps});
                
       }
   })
  
    
});



router.get("/master/users",isLoggedIn,Admin,function(req, res) {
    if(req.user.isAdmin){
   User.find({},function(err, users) {
       if(err)
       {
           req.flash("error",err.message);
       }
       else{
      res.render("campgrounds/users.ejs",{users:users}); 
       }
   });
    }
    else
    {
        req.flash("error","Sorry you don't have permission for entering this page");
        return res.redirect("/campgrounds");
    }
});

router.get("/campgrounds/buyer/:id",function(req, res) {
   
   Camp.findById(req.params.id,function(err,camp)
   {
       if(err)
       {
           req.flash("error","Sorry your request couldn't be fulfilled");
           res.redirect("/campgrounds");
       }
       else
       {
           
           if( !camp.sale || req.user.isAdmin){
               camp.save();
           User.findById(camp.author.id,function(err, seller) {
               if(err)
               {
                   req.flash("error",err.message);
                   res.redirect("/campgrounds");
               }
               else
               {
                   User.findById(camp.requestedBy,function(err, buyer) {
                       if(!err)
                     res.render("campgrounds/seller.ejs",{camp:camp,seller:seller,buyer:buyer});       
                   });
                
               }
           });
           
           }else
           {
               req.flash("error","Product cannot be found");
               return res.redirect("back");
           }
           
       }
       
   });
   
    
});

router.get("/campgrounds/sell/refresh/:id",isLoggedIn,function(req, res) {
    var Buyer = new User();
    Camp.findById(req.params.id,function(err, camp) {
       
      
      if(err)
      {
          req.flash("error","Your request couldn't be fulfilled");
                   res.redirect("/campgrounds");
      }
      else
      {
          if(camp &&!camp.sale){
           User.findById(camp.requestedBy,function(err, buyer) {
               Buyer = buyer;
               if(err)
               {
                   req.flash("error","Your request couldn't be fulfilled");
                   res.redirect("/campgrounds");
               }
               else
               {
                   User.findById(camp.author.id,function(err, seller) {
                       if(!err)
                          res.render("campgrounds/buyer_refresh.ejs",{camp:camp,buyer:buyer,seller:seller});
                   });
                
               }
           });
          }else
          {
              req.flash("error","Sorry, the order for the product "+camp.name+" was cancelled");
              return res.redirect("/campgrounds/user/"+req.user.id);
          }
           
      }
   });
  
   
    
});

router.get("/campgrounds/sell/:id",isLoggedIn,function(req, res) {
   
   Camp.findById(req.params.id,function(err, camp) {
      
      if(err)
      {
          req.flash("error","Your request couldn't be fulfilled");
                   res.redirect("/campgrounds");
      }
      else
      {
          if(!camp.sale){
           User.findById(camp.requestedBy,function(err, buyer) {
               if(err)
               {
                   req.flash("error","Your request couldn't be fulfilled");
                   res.redirect("/campgrounds");
               }
               else
               {
                   User.findById(camp.author.id,function(err, seller) {
                       if(!err)
                          res.render("campgrounds/buyer.ejs",{camp:camp,buyer:buyer,seller:seller});
                   });
                
               }
           });
          }else
          {
             
              return res.redirect("/campgrounds");
          }
           
      }
   });
  
   
   
    
});

router.post("/revoke/:id",isLoggedIn,function(req,res)
{
    Camp.findById(req.params.id,function(err, camp) {
       if(err)
       {
           req.flash("error","Sorry your request couldn't be processed");
       }
       else
       {
           camp.sale=true;
           camp.sold=false;
           camp.agree = false;
           User.findById(camp.requestedBy,function(err, buyer) {
                   User.findById(camp.author.id,function(err, seller) {
                          if(err)
               {
                   req.flash("error",err.message);
                   return res.redirect("/campgrounds");
               }
              
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail', 
                    auth: {
                      user: 'friendskarttech@gmail.com',
                      pass:  process.env.gmail_pw
                    }
      });
      var mailOptions = {
        to:seller.email,
        from: 'friendskarttech@gmail.com',
        subject:seller.profileName+" ,order for your product "+camp.name+" was cancelled",
        text: 'You are receiving this because the order for the product '+camp.name+' was cancelled by '+buyer.profileName+'\n\n' +
         'So, your product is back on sale, check out your profile for more info\n\n'+
         "https://friendskart-shivu1998.c9users.io/campgrounds/user/"+seller._id
      };
      smtpTransport.sendMail(mailOptions, function(err) {
          if(err)
          {
              req.flash("error","Failed to send a mail to buyer");
              return res.redirect("/campgrounds");
          }
        console.log('mail sent');
       
       
      });
                    
                })
                   
                    
                });
        
           camp.requestedBy = "";
           camp.save();
            req.flash("success","We have notified the seller that you have cancelled the order to buy the product");
           res.redirect("back");
       }
    });
    
});

router.get("/master/stats",isLoggedIn,Admin,function(req, res) {
   
   
   Camp.count({$or:[
    {money:true},
    {recieved:true}
  ] },function(err, count) {
       
       stats.productsSold=count;
      

   });
   Camp.count({"sale":true},function(err, count) {
       
       stats.productsInSale=count;
      

   });
    Camp.count(function(err,count){
      if(!err){
          User.count(function(err,users)
          {
              if(!err)
                res.render("campgrounds/stats.ejs",{count:count,users:users,stats:stats});
          });
      }
    });
});
     
function Admin(req,res,next)
{
    if(req.isAuthenticated())
    {
        if(req.user.isAdmin)
        {
          return  next();
        }
        else
        {
            req.flash("error","Sorry you are not permitted");
            return res.redirect("/campgrounds");
        }
    }
}
router.delete("/campgrounds/:id",isLoggedIn,function(req, res) {
   
   Camp.findById(req.params.id,async function(err,camp)
   {
      if(err)
      {
          req.flash("error",err.message);
            res.redirect("back");
      }
      else
      {
          try
          {
             
              if(!camp.sale && !req.user.isAdmin)
              {
                  req.flash("error","Your product is currently being requested by a buyer,check your profile");
                  return res.redirect("/campgrounds/user/"+camp.author.id);
              }
            
              await cloudinary.v2.uploader.destroy(camp.imageId);
              camp.remove();
              req.flash("success","Product "+camp.name+" removed");
              res.redirect("/campgrounds");
            
          }
          catch(err)
          {
              req.flash("error",err.message);
              return res.redirect("back");
                
          }
          
          
      }
   });
    
});

router.get("/campgrounds/user/:id",isLoggedIn,function(req, res) {
   
  
   Camp.find({"author.id":req.params.id},function(err,camps)
   {
       if(err)
       {
           console.log("error in user");
       }
       else
       {
           res.render("campgrounds/products.ejs",{camps:camps});
       }
       
   });
   
    
});
router.get("/campgrounds/user/:id/refresh",isLoggedIn,function(req, res) {
   
  
   Camp.find({"author.id":req.params.id},function(err,camps)
   {
       if(err)
       {
           console.log("error in user");
       }
       else
       {
           res.render("campgrounds/products_refresh.ejs",{camps:camps});
       }
       
   });
   
    
});

router.get("/agree/:id",function(req, res) {
   
   Camp.findById(req.params.id,function(err, camp) {
      if(!camp.sale){
           if(err)
      {
          req.flash("error",err.message);
           return res.redirect("back");
      }
      camp.sold=true;
      camp.agree = true;
      camp.save();
          User.findById(camp.requestedBy,function(err, buyer) {
                          if(err)
               {
                   req.flash("error",err.message);
                   return res.redirect("/campgrounds");
               }
              
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail', 
                    auth: {
                      user: 'friendskarttech@gmail.com',
                      pass:  process.env.gmail_pw
                    }
      });
      var mailOptions = {
        to: buyer.email,
        from: 'friendskarttech@gmail.com',
        subject: 'Seller of the product '+camp.name+" has accepted to sell. Check your profile for more info ",
        text: 'You are receiving this because the product '+camp.name+' was requested by you and the seller has accepted to sell the product.\n\n' +
          'Please click on the following link,to find out more in your profile \n\n'+
          "https://friendskart-shivu1998.c9users.io/mykart"
      };
      smtpTransport.sendMail(mailOptions, function(err) {
          if(err)
          {
              req.flash("error","Failed to send a mail to buyer");
              return res.redirect("/campgrounds");
          }
        console.log('mail sent');
       
       
      });
                    
                })
      
         
        req.flash("success","We have sent notified the buyer that you have accepted to sell, ");
           
        return  res.redirect("back");
      
      }else
      {
           req.flash("error","Sorry, this order was cancelled");
       return res.redirect("/campgrounds");
          
      }
     
      
       
   });
    
});

router.get("/product/accept/:id",isLoggedIn,function(req, res) {
   Camp.findById(req.params.id,function(err, camp) {
       if(!camp.sale){
       if(err)
       {
           req.flash("error",err.message);
           return res.redirect("back");
       }
       camp.sold=true;
       camp.save();
                User.findById(camp.requestedBy,function(err, buyer) {
                          if(err)
               {
                   req.flash("error",err.message);
                   return res.redirect("/campgrounds");
               }
              
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail', 
                    auth: {
                      user: 'friendskarttech@gmail.com',
                      pass:  process.env.gmail_pw
                    }
      });
      var mailOptions = {
        to: buyer.email,
        from: 'friendskarttech@gmail.com',
        subject: 'Seller of the product '+camp.name+" has accepted to chat with you. Check your profile for more info ",
        text: 'You are receiving this because the product '+camp.name+' was requested by you and the seller has accepted to chat with you.\n\n' +
          'Please click on the following link,to find out more in your profile \n\n'+
          "https://friendskart-shivu1998.c9users.io/mykart"
      };
      smtpTransport.sendMail(mailOptions, function(err) {
          if(err)
          {
              req.flash("error","Failed to send a mail to buyer");
              return res.redirect("/campgrounds");
          }
        console.log('mail sent');
       
       
      });
                    
                })
      
         
               req.flash("success","We have  notified the buyer that you have accepted his request,check out chat option below");
           
        return  res.redirect("back");
       }
       req.flash("error","Sorry, this order was cancelled");
       return res.redirect("/campgrounds");
       
       
   })
   
    
});
router.post("/cancel_request/:id",function(req,res)
{
    Camp.findById(req.params.id,function(err, camp) {
       if(err)
       {
           req.flash("error","Sorry,Product not available");
           return res.redirect("/campgrounds");
       }
       
       camp.sale=true;
       camp.sold=false;
       camp.agree = false;
       camp.save();
       res.redirect("/campgrounds/user/"+req.user._id);
       
    });
    
    
    
});
router.get("/terms",function(req, res) {
    res.render("campgrounds/terms.ejs");
})
router.get("/product/decline/:id",isLoggedIn,function(req, res) {
     req.flash("success","We have notified the buyer that you have cancelled his order");
   Camp.findById(req.params.id,function(err, camp) {
       if(err)
       {
           req.flash("error",err.message);
           return res.redirect("back");
       }
       camp.sold=false;
       camp.sale=true;
       camp.agree = false;
          User.findById(camp.requestedBy,function(err, buyer) {
                   User.findById(camp.author.id,function(err, seller) {
                          if(err)
               {
                   req.flash("error",err.message);
                   return res.redirect("/campgrounds");
               }
              
                var smtpTransport = nodemailer.createTransport({
                    service: 'Gmail', 
                    auth: {
                      user: 'friendskarttech@gmail.com',
                      pass:  process.env.gmail_pw
                    }
      });
      var mailOptions = {
        to:buyer.email,
        from: 'friendskarttech@gmail.com',
        subject:buyer.profileName+" ,the product "+camp.name+" which you have ordered was cancelled by the seller "+seller.profileName,
        text: 'You are receiving this because your order for the product '+camp.name+' was cancelled by '+seller.profileName+'\n\n' +
          "click the below link to go to your cart \n\n"+
         "https://friendskart-shivu1998.c9users.io/campgrounds/mykart"
      };
      smtpTransport.sendMail(mailOptions, function(err) {
          if(err)
          {
              req.flash("error","Failed to send a mail to buyer");
              return res.redirect("/campgrounds");
          }
        console.log('mail sent');
       
       
      });
                    
                })
                   
                    
                });
        
       
       camp.requestedBy = "";
       camp.save();
       res.redirect("/campgrounds");
       
   })
    
});

router.get("/money/:id",isLoggedIn,function(req, res) {
   
   Camp.findById(req.params.id,function(err, camp) {
      
      camp.money=true;
      camp.save();
      res.redirect("/campgrounds/user/"+camp.author.id);
      
       
   });
   
});


router.get("/recieved/:id",function(req, res) {
   
   Camp.findById(req.params.id,function(err, camp) {
      
      camp.recieved=true;
      camp.save();
      res.redirect("/mykart");
      
       
   });
    
});

router.delete("/user/:id",function(req, res) {
    
   User.findByIdAndRemove(req.params.id,function(err, user) {
       
      
            if(err)
            {
                res.redirect("back");
            }
            Camp.find({"requestedBy":user._id},function(err, camps) {
               
               if(!err)
               {
                   camps.forEach(function(camp)
                   {
                       if(!camp.sale)
                       {
                           
                           camp.sale=true;
                           camp.sold=false;
                           camp.agree=false;
                           camp.save();
                           
                       }
                       
                   });
               }
                
            });
             Camp.remove({"author.id":user._id},function(err, camps) {
                 if(!err){
             req.flash("success","Account with username "+user.username+" removed successfully");
             res.redirect("back");
                 }
           
    });
    
         
       
       });

                  
     
});

router.get("/contact",function(req,res)
{
    res.render("campgrounds/email.ejs");
});

router.get("*",function(req, res) {
     
   res.redirect("/campgrounds"); 
});



function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};


function isLoggedIn(req,res,next){
    
    if(req.isAuthenticated())
    {
        return next();
    }
    
    req.flash("error","LogIn and be part of our community!!!");
    res.redirect("/login");
}

module.exports = router;