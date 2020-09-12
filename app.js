   var express=require("express"),
    app=express(),
    bodyparser=require("body-parser"),
    flash = require("connect-flash"),
    passport=require("passport"),
    LocalStrategy=require("passport-local"),
    methodOverride = require("method-override"),
    Campground = require("./models/campgrounds"),
    Comment=require("./models/comment"),
    User=require("./models/user"),
    seedDB = require("./seeds")

    //var commentRoutes = require("./routes/comments")

//seedDB();
    const mongoose = require('mongoose');
    mongoose.connect('mongodb://localhost:27017/yelp_camp', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })
    .then(() => console.log('Connected to DB!'))
    .catch(error => console.log(error.message));

app.use(bodyparser.urlencoded({extended:true}));
app.set("view engine","ejs");
app.use(express.static(__dirname + "/public"));
app.use(flash());
app.use(methodOverride("_method")); //look for _method in methodOverride

console.log(__dirname);

//PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret:"ayushi",
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req,res,next){
    res.locals.currentUser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});




app.get("/",function(req,res){
    res.render("land");
});


//INDEX route
app.get("/campgrounds",function(req,res){    //shows all campgrounds
    //get all data from database
    
    Campground.find({},function(err,allCampgrounds){
        if(err){
            console.log(err);
        }else{
            res.render("campgrounds/index",{campgrounds:allCampgrounds , currentUser: req.user});
        }
    });
    //


});
//CREATE route: add new 
app.post("/campgrounds", isLoggedIn , function(req,res){

    //get data from form and add to db
    //redirect back to campgrounds page
    var name=req.body.name;
    var price = req.body.price;
    var image=req.body.image;
    var desc=req.body.description;//name attribute in new.ejs
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    var newCampground={name:name,price:price,image:image,description:desc,author:author}
    //create a new campground and save to database
    Campground.create(newCampground, function(err , newlyCreated){
        if(err){
            console.log(err);
        }else{
            //redirect to campgrounds page
            console.log(newlyCreated);
            res.redirect("/campgrounds");
        }
    });
    
   
});


//NEW route:show form to create a new campground
app.get("/campgrounds/new", isLoggedIn , function(req,res){    //form
    res.render("campgrounds/new.ejs");
})

//SHOW route
app.get("/campgrounds/:id",function(req,res){
    //find the campground with provided id
    Campground.findById(req.params.id).populate("comments").exec( function(err,foundCampground){
        if(err){
            console.log(err);
        }else{
            //render show template with that campground
            res.render("campgrounds/show",{campground:foundCampground});//can be campgrounds as well
        }
    });
    
});

//EDIT CAMPGROUND ROUTE
app.get("/campgrounds/:id/edit" , checkCampgroundOwnership , function(req,res){
    Campground.findById(req.params.id, function(err, foundCampground){
         res.render("campgrounds/edit" , {campground: foundCampground});
    
        });
    
});

//UPDATE CAMPGROUND ROUTE
app.put("/campgrounds/:id" ,checkCampgroundOwnership, function(req,res){
    //finnd and update the corret campground
    Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err,updatedCampground){
        if(err){
            res.redirect("/campgrounds");
        } else {
            res.redirect("/campgrounds/"+req.params.id);
        }
    });
});

//DESTROY CAMPGROUND ROUTE
app.delete("/campgrounds/:id" ,checkCampgroundOwnership, function(req,res){
    Campground.findByIdAndRemove(req.params.id, function(err){
        if(err){
            res.redirect("/campgrounds");
        } else {
            res.redirect("/campgrounds");
        }
    });
});

//====================================
//COMMENTS ROUTES
//====================================

app.get("/campgrounds/:id/comments/new", isLoggedIn , function(req,res){
   //find campground by id
   Campground.findById(req.params.id, function(err , campground){
       if(err){
           console.log(err);
       }else{
        res.render("comments/new" , {campground:campground});
       }
   });
   
    
});

app.post("/campgrounds/:id/comments", isLoggedIn ,function(req,res){
    //lookup campground using id
    Campground.findById(req.params.id, function(err, campground){
        if(err){
            console.log(err);
            res.redirect("/campgrounds");
        }else{
            Comment.create(req.body.comment, function(err, comment){
                if(err){
                    req.flash("error" , "something went wrong");
                    console.log(err);
                }else{
                    //add username and id to comment
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    //save comment
                    comment.save();
                    campground.comments.push(comment);
                    campground.save();
                    console.log(comment);
                    req.flash("success" , "successfully added comment");
                    res.redirect('/campgrounds/' + campground._id);
                }
            });
            
        }
    });
    //create new comment
    //connect new comment to campground
    //redirect campground show page


});

//===========================
//AUTH ROUTES
// show register form
app.get("/register" , function(req,res){
    res.render("register");
});

//handle sign up logic
//when submit button is prerssed
app.post("/register" , function(req,res){
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err,user){
        if(err){
            req.flash("error" , err.message);
            return res.render("register");
        }
        passport.authenticate("local")(req,res,function(){
            req.flash("success" , "welcome to yelpcamp" + user.username);
            res.redirect("/campgrounds");
        });
    });
});

//show login form
app.get("/login" , function(req,res){
    res.render("login");
});

//handle login logic
app.post("/login" , passport.authenticate("local" ,
    {
        successRedirect:"/campgrounds",
        failureRedirect: "/login"
    }), function(req,res){
    
});

//logout logic
app.get("/logout" , function(req,res){
    req.logout();
    req.flash("success" , "logged out");
    res.redirect("/campgrounds");
});

//MIDDLEWARES
function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error" , "please login first !");
    res.redirect("/login");
}

function checkCampgroundOwnership(req,res,next){
    if(req.isAuthenticated()){
        

        Campground.findById(req.params.id, function(err, foundCampground){
            if(err){
                req.flash("error" , "campground not found!");
                res.redirect("back");
            }else{
                //if logged in , does he own the campground?
                if(foundCampground.author.id.equals(req.user._id)){
                    next();
                } else{
                    req.flash("error" , "permission denied!");
                    res.redirect("back");
                }
                
    
            }
        });
    } else {
        req.flash("error" , "please login first!");
        res.redirect("back");
    }
}

app.listen(3000,function(){
    console.log("serving");
});