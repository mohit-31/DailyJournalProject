require("dotenv").config();
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");
//const bcrypt = require("bcrypt");
//const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require("mongoose-findorcreate");


const app=express();

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

app.set('view engine','ejs');

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: true,

}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-mohitsingh:test123@cluster0.hkd3z.mongodb.net/accountDB", {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set("useCreateIndex",true);

const journalSchema=new mongoose.Schema({
  title:String,
  content:String

});
const Journal=mongoose.model("Journal",journalSchema);
const accountSchema=new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  data:[journalSchema]

});

accountSchema.plugin(passportLocalMongoose);
accountSchema.plugin(findOrCreate);
const Account=mongoose.model("Account",accountSchema);
passport.use(Account.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, done) {
 done(null, user.id);
});

passport.deserializeUser(function(id, done) {
 Account.findById(id, function(err, user) {
  done(err, user);
});
});

//passport.serializeUser(Account.serializeUser());
//passport.deserializeUser(Account.deserializeUser());


passport.use(new GoogleStrategy({
    clientID:process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/dailyjournals",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    Account.findOrCreate({ googleId: profile.id }, function (err, account) {
      return cb(err, account);
    });
  }
));



app.get("/",function(req,res){
  res.render("firstpage");
});
app.get("/auth/google",passport.authenticate("google",{scope:["email","profile"]}));

app.get("/auth/google/dailyjournals",
 passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    //Successful authentication, redirect home.
    res.redirect("/home");
  });

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/login",function(req,res){
  res.render("login");

});
app.get("/compose",function(req,res){
  res.render("compose");
});

app.get("/home",function(req,res){
  if(req.isAuthenticated()){
  Account.findById(req.user.id,function(err,foundAccount){
    if(err){
      console.log(err);
    }
    else{
      if(foundAccount){
        res.render("home",{posts:foundAccount.data});
      }
    }
  });
}
else{
  res.redirect("/register");
}
});




  //if(req.isAuthenticated()){
  //  res.render("home");
  //}
  //else{
  //  res.redirect("/register");
  //}



app.post("/compose",function(req,res){
  const postTitle=req.body.postTitle;
  const postBody=req.body.postBody;
  const journal1=new Journal({
    title:postTitle,
    content:postBody
  });

  Account.findById(req.user.id,function(err,foundUser){
  if(err){
    console.log(err);
  }
  else{
    if(foundUser){
      foundUser.data.push(journal1);
      foundUser.save(function(){
        res.render("home",{posts:foundUser.data});
      });
    }
  }
});
});





app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});

app.post("/register",function(req,res){
  Account.register({username:req.body.username},req.body.password,function(err,account){
    if(err){
      console.log(err);
      res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/home");
      });
    }
  });

});

app.post("/login",function(req,res){
  const account=new Account({
    username:req.body.username,
    password:req.body.password
  });
  req.login(account,function(err){
    if(err){
      console.log(err);
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/home");

    });
  }

  });


});
















app.listen(process.env.PORT || 3000,function(){
  console.log("Server is started successfully");
});
