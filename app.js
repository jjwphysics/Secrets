//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));
app.use(session({
  secret: process.env.SECRET,
  resave:false,
  saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());
mongoose.connect('mongodb+srv://admin:jang050517@cluster0.wh0g8.mongodb.net/userDB',{useNewUrlParser:true});
mongoose.set("useCreateIndex",true);
const userSchema = new mongoose.Schema({
  username:String,
  password:String
});

const secretSchema = new mongoose.Schema({
  content:String,
  liked:[userSchema],
  unliked:[userSchema],
  comment:[String]
});


userSchema.plugin(passportLocalMongoose);
const User = new mongoose.model("User",userSchema);
const Secret = new mongoose.model("Secret",secretSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

app.get("/",function(req,res){
  res.render("home");
});

app.get("/login",function(req,res){
  res.render("login");
});

app.post("/login",function(req,res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user,function(err){
    if(err){
      res.render("err",{errContent:err});
    }
    else passport.authenticate("local")(req,res,function(){
      res.redirect("/secrets");
    });
  })
});

app.get("/register",function(req,res){
  res.render("register");
});

app.post("/register",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err) res.render("err",{errContent:err});
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/secrets");
      });
    }
  })
});

app.get("/secrets",function(req,res){
  if(req.isAuthenticated()){
    Secret.find({},function(err,foundSecrets){
      if(err) res.render("err",{errContent:err});
      else res.render("secrets",{allSecrets:foundSecrets,startSlide:0});
    });
  }
  else res.redirect("/");
})

app.get("/secrets/:startSlide",function(req,res){
  if(req.isAuthenticated()){
    Secret.find({},function(err,foundSecrets){
      if(err) res.render("err",{errContent:err});
      else res.render("secrets",{allSecrets:foundSecrets,startSlide:req.params.startSlide});
    });
  }
  else res.redirect("/");
})

app.post("/secrets",function(req,res){
  User.findById(req.user.id, function(err, foundUser){
    if (!err) {
      if (foundUser) {
        if(req.body.liked){
          Secret.update({_id:req.body.liked},{$pull: {liked: foundUser}},function(err){});
          Secret.update({_id:req.body.liked},{$pull: {unliked: foundUser}},function(err){});
          Secret.update({_id:req.body.liked},{$push: {liked: foundUser}},function(err){});
          res.redirect("/secrets/"+req.body.page);
        }
        else if(req.body.unliked){
          Secret.update({_id:req.body.unliked},{$pull: {liked: foundUser}},function(err){});
          Secret.update({_id:req.body.unliked},{$pull: {unliked: foundUser}},function(err){});
          Secret.update({_id:req.body.unliked},{$push: {unliked: foundUser}},function(err){});
          res.redirect("/secrets/"+req.body.page);
        }
        else if(req.body.comment){
          res.redirect("/comment/"+req.body.page+"/"+req.body.comment);
        }
      }
    }
  });
});

app.get("/submit",function(req,res){
  if(req.isAuthenticated()) res.render("submit");
  else res.redirect("/");
});

app.post("/submit",function(req,res){
  const newSecret = new Secret({
    content:req.body.secret,
    liked:[],
    unliked:[],
    comment:[]
  });
  newSecret.save();
  res.redirect("/secrets");
});

app.get("/comment/:page/:secretId",function(req,res){
  if(req.isAuthenticated()){
    Secret.findOne({_id:req.params.secretId},function(err,foundSecret){
      if(!err) res.render("comment",{secret:foundSecret,page:req.params.page});
    });
  }
  else res.redirect("/");
});

app.post("/comment",function(req,res){
  const secretId = req.body.id;
  const secretComment = req.body.comment;
  Secret.update({_id:secretId},{$push: {comment: secretComment}},function(err){});
  res.redirect("/comment/"+req.body.page+"/"+secretId);
});

app.post("/return",function(req,res){
  res.redirect("/secrets/"+req.body.page);
});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
})

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function() {
   console.log("Server has started successfully");
 })
