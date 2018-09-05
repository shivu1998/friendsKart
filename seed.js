var mongoose = require("mongoose");

var Comment = require("./models/comments");
var Camp = require("./models/campground");

var data = [
    {
        name:"Earth ",
        image:"https://farm9.staticflickr.com/8422/7842069486_c61e4c6025.jpg",
        description:"It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. Many desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like)."
        
    },
     {
        name:"Earth ",
        image:"https://farm4.staticflickr.com/3361/3576042205_cdaae278ee.jpg",
        description:"beautiful"
        
    },
     {
        name:"Earth ",
        image:"https://farm4.staticflickr.com/3361/3576042205_cdaae278ee.jpg",
        description:"beautiful"
        
    }
    
    
    ];

function seeds(){
Camp.remove({},function(err,camps)
{
    if(err)
    {
        console.log(err);
    }
    else
    {
        console.log("All are removed ");
        data.forEach(function(camp)
        {
            Camp.create(camp,function(err,createdCamp)
            {
                if(err)
                {
                    console.log(err);
                }
                else
                {
                    console.log("campground created");
                    Comment.create({
                        text:"No internet",
                        author:"Dosto"
                    },function(err,comment)
                    {
                       if(err)
                       {
                           console.log(err);
                       }
                       else
                       {
                          createdCamp.comments.push(comment);
                          createdCamp.save();
                          console.log("Created new comment");
                       }
                    });
                }
                
            });
        });
    }
    
});

}

module.exports = seeds;
