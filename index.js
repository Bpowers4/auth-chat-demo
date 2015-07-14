(function() {

  // Setting up web
  var express = require('express');
  var bodyParser = require('body-parser');
  var cookieParser = require('cookie-parser');
  var session = require('express-session');
  var ejs = require('ejs');
  var util = require('util');

  var passport = require('passport');
  var GitHubStrategy = require('passport-github2').Strategy;

  var GITHUB_CLIENT_ID = '614733545a5a4294d951';
  var GITHUB_CLIENT_SECRET = '486e1739d614e4066499c8f28a07d613bd1dade5';

  var app = express();

  // configure Express
  app.set('views', __dirname + '/views');
  app.set('view engine', 'html');
  app.engine('html', ejs.renderFile);
  app.use(express.static(__dirname + '/public'));
  app.use(cookieParser());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false
  }));
  app.use(passport.initialize());
  app.use(passport.session());


  passport.serializeUser(function(user, done) {
    done(null, user);
  });

  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });

  passport.use(new GitHubStrategy({
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: "/callback"
    },
    function(accessToken, refreshToken, profile, done) {
      var user = profile;
      user.accessToken = accessToken;
      return done(null, user); 
    }
  ));


  // Crypto
  // var crypto = require('crypto')

  // var sha1sum = function(str){
  //   return crypto.createHash('sha1').update(str).digest('hex');
  // }

  var pubnub = require('pubnub');
  var channel = 'pam-chat-demo';
  var channelPres = 'pam-chat-demo-pnpres';

  pubnub = pubnub.init({
    subscribe_key: 'sub-c-981faf3a-2421-11e5-8326-0619f8945a4f',
    publish_key: 'pub-c-351c975f-ab81-4294-b630-0aa7ec290c58',
    secret_key: 'sec-c-M2U0N2Q2MzktNDI3Yi00ODA5LTkwMjAtYzc1NmM2YTAxMDBl',
    auth_key: 'nyancat-nyan-nyan-nyan',
    ssl: true
  });

  pubnub.grant({ 
    channel: channel + ',' + channelPres, 
    auth_key: 'nyancat-nyan-nyan-nyan', 
    read: true, 
    write: true, 
    callback: function(m){console.log(m);} ,
    error: function(err){console.log(err);}
  });

  //Routes 

  app.get('/', function (req, res) {
    res.render('index.html', { user: req.user });

    if(req.user) {

      pubnub.grant({ 
        channel: channel + ',' + channelPres, 
        auth_key: req.user.accessToken, 
        read: true, 
        write: false, 
        callback: function(m){console.log(m);} ,
        error: function(err){console.log(err);}
      });
    }

    pubnub.audit({
      callback: function(m){
        console.log(util.inspect(m, false, null));
      }
    });
    
  });

  app.post('/', function (req, res) { 

    if(!req.user) return;

    var safeText = req.body.text.replace(/\&/g, '&amp;').replace( /</g,  '&lt;').replace(/>/g,  '&gt;');

    var uuid = req.user.username;
    var avatar = req.user.avatar;

    pubnub.publish({
        channel: channel, 
        message: {uuid: req.user.username, avatar: req.user._json.avatar_url, text: safeText},
        callback: function(m) {console.log(m);},
        error: function(err) {console.log(err);}
    });

    res.send('ok');
  });

  app.get('/login', 
    passport.authenticate('github', { scope: ['user']}),
    function(req, res) {

  });

  app.get('/callback', passport.authenticate('github', { failureRedirect: '/login' }),
    function(req, res) {
      res.redirect('/');
  });

  var server = app.listen(process.env.PORT | 3000);

})();