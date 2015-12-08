var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require("express-session")
var cookieParser = require('cookie-parser');



var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var Sessions = require('./app/collections/sessions');
var Session = require('./app/models/session');
var uuid = require('uuid');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
app.use(cookieParser());

// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));



app.get('/',
function(req, res) {
  util.authenticate(req.cookies.sessionId, function(matched){
    if (matched) {
      res.render('index');
    } else {
      res.redirect('/login')
    }
  })
});

app.get('/create',
function(req, res) {
  util.authenticate(req.cookies.sessionId, function(matched){
    if (matched) {
      res.render('index');
    } else {
      res.redirect('/login')
    }
  })
  // res.render('index');
});

app.get('/links', function(req, res) {
  util.authenticate(req.cookies.sessionId, function(matched){
    if (matched) {
      Links.reset().fetch().then(function(links) {
        res.send(200, links.models);
      });
      // res.render('create');
    } else {
      res.redirect('/login')
    }
  })
});

app.post('/links',
function(req, res) {
  util.authenticate(req.cookies.sessionId, function(matched){
    if (matched) {
      if (!util.isValidUrl(uri)) {
        console.log('Not a valid url: ', uri);
        return res.send(404);
      }

      new Link({ url: uri }).fetch().then(function(found) {
        if (found) {
          res.send(200, found.attributes);
        } else {
          util.getUrlTitle(uri, function(err, title) {
            if (err) {
              console.log('Error reading URL heading: ', err);
              return res.send(404);
            }

            var link = new Link({
              url: uri,
              title: title,
              base_url: req.headers.origin
            });

            link.save().then(function(newLink) {
              Links.add(newLink);
              res.send(200, newLink);
            });
          });
        }
      });
      // res.render('create');
    } else {
      res.redirect('/login')
    }
  })
  var uri = req.body.url;

});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login',
function(req, res) {
  if(req.cookies.sessionId) {
    console.log('session cookie', req.cookies.sessionId)
    new Session({id: req.cookies.sessionId}).fetch().then(function(found){
      if (found !== null) {
        console.log('found', found.attributes.id);
        db.knex('sessions')
          .where('id', '=', found.attributes.id)
          .del()
          .catch(function(error) {
      });
        // console.log(query.toString())

      }
    });
  }
  res.render('login');
});

app.get('/signup',
function(req, res) {
  // if (not logged in) app.get/login
  res.render('signup');
});

app.post('/login', function (req, res) {
  var username = req.body.username;
  var password = req.body.password;
  new User({ username: username }).fetch().then(function(found) {
    if (found === null) {
      res.redirect('/login');
    } else if ( username === found.attributes.username && password === found.attributes.password ) {

      var session = new Session ({
        id: uuid(),
        user_id: found.attributes.id
      });

      session.save(null, {method: 'insert'}).then(function(newSession) {
        Sessions.add(newSession);
        res.cookie('sessionId', newSession.attributes.id);
        res.redirect('/');
      })

    }

  });
});



app.post('/signup', function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  new User({ username: username}).fetch().then(function(found) {
    if (found) {
      console('already as user')
    } else {

      var user = new User({
        username: username,
        password: password
      });

      user.save().then(function(newUser) {
        Users.add(newUser);
        return res;

      })
      .then(function(res) {
        new User({ username: username }).fetch().then(function(found) {
          var session = new Session ({
          id: uuid(),
          user_id: found.attributes.id
        });

        session.save(null, {method: 'insert'}).then(function(newSession) {
          Sessions.add(newSession);
          res.cookie('sessionId', newSession.attributes.id);
          res.redirect('/');
        })

      })
      })
    }
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
