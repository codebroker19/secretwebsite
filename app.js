//jshint esversion:6
require('dotenv').config();
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const app=express();
const GoogleStrategy = require( 'passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
const mongoose=require("mongoose");
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
  secret:"Ourlittlesecret.",
  resave:false,
  saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-debanshu:pandisandi@cluster0.4n2mx.mongodb.net/userDB",{useNewUrlParser:true});
mongoose.set("useCreateIndex",true);
const userSchema=new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secret:Array
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
console.log(process.env.API_KEY);

const User=new mongoose.model("User",userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
passport.use(new GoogleStrategy({
    clientID:     process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL:"https://desolate-meadow-89334.herokuapp.com/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
app.get("/auth/google",passport.authenticate("google",{scope:["profile"]}));

app.get( "/auth/google/secrets",
    passport.authenticate( "google", {
        failureRedirect: "/login"
}),
function(req,res){
  res.redirect("/secrets");
}
);
app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else{
    res.redirect("/login");
  }
});
app.post("/submit",function (req, res){
  if(req.isAuthenticated()){
    User.findById(req.user.id,function (err, user){
      user.secret.push(req.body.secret);
      user.save(function (){
        res.redirect("/secrets");
      });
    });

  }else {
   res.redirect("/login");
  }
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});
app.get("/",function(req,res){
  res.render("home");
});
app.get("/secrets", function(req, res){
  User.find({secret: {$ne: null}}, function(err, users){
    if (err){
      console.log(err);
    } else {
      if (users) {
        res.render("secrets", {usersWithSecrets: users});
      }
    }
  });
});


app.post("/register",function(req,res){

User.register({username:req.body.username},req.body.password,function(err,user){
  if(err){
    console.log(err);

  }
  else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    });
  }
});

});
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});
app.post("/login",function(req,res){
const user=new User({
  username:req.body.username,
  password:req.body.password
});
req.login(user,function(err){
  if(err){
    console.log(err);
  }
  else{
    passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    });
  }
});
});

app.listen(process.env.PORT || 3000, function(){
  console.log("Express server listening mode");
});
