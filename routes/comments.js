var express = require("express");
var router  = express.Router();
var Camp = require("../models/campground");
var Comment = require("../models/comments");
var bodyParser = require("body-parser");
var methodOverride = require("method-override");

router.use(bodyParser.urlencoded({extended:true}));

router.use(methodOverride("_method"));

router.post("/campgrounds/:id/comments",isLoggedIn,function(req,res)
{
    Camp.findById(req.params.id,function(err,camp)
    {
        if(err)
        {
            res.redirect("/campgrounds");
        }
        else
        {
            var data = req.body.comments;
            Comment.create(data,function(err,comment)
            {
                if(err)
                {
                    req.flash("error","Sorry, something went wrong!!!");
                    console.log("/campgrounds");
                }
                else
                {
                    if(req.body.comments.text !== ""){
                comment.author.id = req.user._id;  
                comment.author.username = req.user.profileName;
                comment.save();
                camp.comments.push(comment);
                camp.save();
                req.flash("success","Comment added successfully");
                res.redirect("/campgrounds/"+req.params.id);
                }
                else
                {
                  req.flash("error","Comment can't be empty");    
                  res.redirect("/campgrounds/"+req.params.id);   
                }
                }
            });
        }
    });
});
                
          


router.get("/campgrounds/:id/comments/new",isLoggedIn,function(req, res) {
   
   Camp.findById(req.params.id,function(err,camp)
   {
       if(err)
       {
           res.redirect("/campgrounds");
           
       }
       else
       {
            res.render("comments/new.ejs",{camp:camp});
       }
       
   });
  
    
});

router.get("/campgrounds/:id/comments/:comment_id/edit",belongsToMe,function(req,res)
{
    var camp_id = req.params.id;
    var comment_id = req.params.comment_id;
               Comment.findById(comment_id,function(err, comment) {
                if(err)
                {
                    res.redirect("back");
                }
                else
                {
                      res.render("comments/edit.ejs",{camp_id:camp_id,comment:comment});
                }
                
        
    });
  
    
});

router.put("/campgrounds/:id/comments/:comment_id",belongsToMe,function(req,res)
{
    
    var camp_id = req.params.id;
    var comment_id = req.params.comment_id;
    
            var data = req.body.comments;
            Comment.findByIdAndUpdate(comment_id,data,function(err, comment) {
                if(err)
                {
                    res.redirect("back");
                }
                else
                {
                      res.redirect("/campgrounds/"+camp_id);
                }
          
    });
  
});

router.delete("/campgrounds/:id/comments/:comment_id",belongsToMe,function(req,res)
{
   
   Comment.findByIdAndRemove(req.params.comment_id,function(err,comment)
   {
       if(err)
       {
           res.redirect("back");
       }
       else
       {
            req.flash("success","Comment deleted successfully");
            res.redirect("/campgrounds/"+req.params.id);
       }
       
   });
    
});

function belongsToMe(req,res,next)
{
    if(req.isAuthenticated() || req.user.isAdmin)
    {
        Comment.findById(req.params.comment_id,function(err, comment) {
            if(err)
            {
                res.redirect("back");
            }
            else
            {
                // console.log(comment);
                if(comment.author.id.equals(req.user._id) || req.user.isAdmin)
                {
                    next();
                }
                else
                {
                    req.flash("error","Sorry you are not permitted to do that!!!");
                    res.redirect("/campgrounds/"+req.params.id);
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




function isLoggedIn(req,res,next){
    
    if(req.isAuthenticated())
    {
        return next();
    }
    req.flash("error","LogIn and be part of our community!!!");
    res.redirect("/login");
    
}

module.exports = router;