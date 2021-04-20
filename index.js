const mongoose = require('mongoose');
const Models = require('./models.js');
const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const morgan = require('morgan');
const passport = require('passport');
require('./passport');
const cors = require('cors');
let allowedOrigins = [
  'http://localhost:8080/',
  'https://movie-api-db-30.herokuapp.com/',
  'http://localhost:1234',
];

const app = express();
app.use(express.json());
app.use(bodyParser.json());
let auth = require('./auth')(app);

//cors security
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        // If a specific origin isn’t found on the list of allowed origins
        let message = 'The CORS policy for this application doesn’t allow access from origin ' +
          origin;
        return callback(new Error(message), false);
      }
      return callback(null, true);
    },
  }),
);

//summon express static on public
app.use(express.static('public'));

//calling on the models.js schemas
const Movies = Models.Movie;
const Users = Models.User;

//require express validator
const {check, validationResult} = require('express-validator');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.CONNECTION_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
/*
mongoose.Promise = global.Promise;
mongoose.connect(
  'mongodb+srv://wafa-chaari:movieapidb30@cluster0.zhrb5.mongodb.net/movieAPIDB?retryWrites=true&w=majority',
  {useNewUrlParser: true, useUnifiedTopology: true},
);*/

mongoose.connection
  .once('open', function() {
    console.log('Conection has been made!');
  })
  .on('error', function(error) {
    console.log('Error is: ', error);
  });

// GET requests
app.get('/', (req, res) => {
  res.send('Welcome to my top 10 movies!');
});
app.get('/documentation', (req, res) => {
  res.sendFile('/public/documentation.html', {root: __dirname});
});

// Return a list of ALL movies to the user
app.get(
  '/movies',
  //  passport.authenticate('jwt', {session: false}),
  (req, res) => {
    Movies.find()
      .then(movies => {
        res.status(201).json(movies);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  },
);

//Return data (description, genre, director, image URL, whether it’s featured or not) about a single movie by title to the user

app.get(
  '/movies/:Title',
  passport.authenticate('jwt', {session: false}),
  (req, res) => {
    Movies.findOne({Title: req.params.Title})
      .then(movie => {
        res.json(movie);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  },
);

//Return data about a genre (description) by name/title (e.g., “Thriller”)

app.get(
  '/movies/genre/:Name',
  passport.authenticate('jwt', {session: false}),
  (req, res) => {
    let genre = req.params.Name;
    Movies.findOne({'Genre.Name': genre})
      .then(genreName => {
        res.status(202).json(genreName.Genre.Description);
      })
      .catch(error => {
        console.log(error);
        res.status(500).send('Error 500: ' + error);
      });
  },
);

//Return data about a director (bio, birth year, death year) by name
app.get(
  '/movies/director/:Name',
  passport.authenticate('jwt', {session: false}),
  (req, res) => {
    let director = req.params.Name;
    Movies.findOne({'Director.Name': director})
      .then(directorname => {
        res.status(202).json(directorname.Director);
      })
      .catch(error => {
        console.log(error);
        res.status(500).send('Error 500: ' + error);
      });
  },
);

//Allow new users to register

app.post(
  '/users',
  [
    check('Username', 'Username is required').isLength({min: 5}),
    check(
      'Username',
      'Username contains non alphanumeric characters - not allowed.',
    ).isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail(),
  ],
  (req, res) => {
    // check the validation object for errors
    let errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).json({errors: errors.array()});
    }

    let hashedPassword = Users.hashPassword(req.body.Password);
    Users.findOne({Username: req.body.Username}) // Search to see if a user with the requested username already exists
      .then(user => {
        if (user) {
          //If the user is found, send a response that it already exists
          return res.status(400).send(req.body.Username + ' already exists');
        } else {
          Users.create({
            Username: req.body.Username,
            Password: hashedPassword,
            Email: req.body.Email,
            Birthday: req.body.Birthday,
          })
            .then(user => {
              res.status(201).json(user);
            })
            .catch(error => {
              console.error(error);
              res.status(500).send('Error: ' + error);
            });
        }
      })
      .catch(error => {
        console.error(error);
        res.status(500).send('Error: ' + error);
      });
  },
);

//get all users

app.get(
  '/users',
  passport.authenticate('jwt', {session: false}),
  (req, res) => {
    Users.find()
      .then(users => {
        res.status(201).json(users);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  },
);

//Allow users to update their user info (username)

app.put(
  '/users/:Username',
  passport.authenticate('jwt', {session: false}),
  [
    check('Username', 'Username is required').isLength({min: 5}),
    check(
      'Username',
      'Username contains non alphanumeric characters - not allowed.',
    ).isAlphanumeric(),
    check('Password', 'Password is required').not().isEmpty(),
    check('Email', 'Email does not appear to be valid').isEmail(),
  ],
  (req, res) => {
    let errors = validationResult(req); //checks the validation object for errors

    if (!errors.isEmpty()) {
      return res.status(422).json({errors: errors.array()});
    }

    let hashedPassword = Users.hashPassword(req.body.Password);

    Users.findOneAndUpdate(
      {Username: req.params.Username},
      {
        $set: req.body,
      },
      {new: true},
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error: ' + err);
        } else {
          res.status(201).json(updatedUser);
        }
      },
    );
  },
);

//Allow users to add a movie to their list of favorites (showing only a text that a movie has been added—more on this later)

app.post(
  '/users/:Username/movies/:MovieID',
  passport.authenticate('jwt', {session: false}),
  (req, res) => {
    Users.findOneAndUpdate(
      {Username: req.params.Username},
      {
        $push: {FavoriteMovies: req.params.MovieID},
      },
      {new: true}, // This line makes sure that the updated document is returned
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error: ' + err);
        } else {
          res.json(updatedUser);
        }
      },
    );
  },
);

// Gets the data about a single user, by name

app.get(
  '/users/:Username',
  passport.authenticate('jwt', {session: false}),
  (req, res) => {
    Users.findOne({Username: req.params.Username})
      .then(user => {
        res.json(user);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  },
);

//Allow users to remove a movie from their list of favorites (showing only a text that a movie has been removed—more on this later)

app.delete(
  '/users/:Username/movies/:MovieID',
  passport.authenticate('jwt', {session: false}),
  (req, res) => {
    Users.findOneAndUpdate(
      {Username: req.params.Username},
      {
        $pull: {FavoriteMovies: req.params.MovieID},
      },
      {new: true}, // This line makes sure that the updated document is returned
      (err, updatedUser) => {
        if (err) {
          console.error(err);
          res.status(500).send('Error: ' + err);
        } else {
          res.status(200).send(req.params.MovieID + ' was deleted.');
        }
      },
    );
  },
);

//Allow existing users to deregister (showing only a text that a user email has been removed—more on this later)

app.delete(
  '/users/:Username',
  passport.authenticate('jwt', {session: false}),
  (req, res) => {
    Users.findOneAndRemove({Username: req.params.Username})
      .then(user => {
        if (!user) {
          res.status(400).send(req.params.Username + ' was not found');
        } else {
          res.status(200).send(req.params.Username + ' was deleted.');
        }
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  },
);
//show all actors
app.get(
  '/actors',
  passport.authenticate('jwt', {session: false}),
  (req, res) => {
    Actors.find()
      .then(actors => {
        res.status(201).json(actors);
      })
      .catch(err => {
        console.error(err);
        res.status(500).send('Error: ' + err);
      });
  },
);

// listen for requests
/*app.listen(8080, () => {
  console.log('Your app is listening on port 8080.');
});*/
//error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// log listening on 8080 and open port 0.0.0.0
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on Port ' + port);
});
