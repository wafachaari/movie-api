const express = require('express'),
  bodyParser = require('body-parser'),
  uuid = require('uuid'),
  Models = require('./models.js'),
  mongoose = require('mongoose'),
  morgan = require('morgan');
const app = express();
const cors = require('cors');
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('common'));
app.use(express.static('public'));

const Movies = Models.Movie;
const Users = Models.User;
const Actors = Models.Actor;

const passport = require('passport');
require('./passport');
let auth = require('./auth')(app);
const {check, validationResult} = require('express-validator');
mongoose.connect('mongodb://localhost:27017/movieAPIDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
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
  passport.authenticate('jwt', {session: false}),
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

app.post('/users', (req, res) => {
  let hashedPassword = Users.hashPassword(req.body.Password);
  const {Username, Password, Email, Birthday} = req.body;

  Users.findOne({Username: req.body.Username})
    .then(user => {
      if (user) {
        return res.status(400).send(req.body.Username + 'already exists');
      } else {
        Users.create({
          Username: Username,
          Password: Password,
          Email: Email,
          Birthday: Birthday,
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
});

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
  (req, res) => {
    Users.findOneAndUpdate(
      {Username: req.params.Username},
      {
        $set: req.body,
        /*  $set: {
          Username: req.body.Username,
          Password: req.body.Password,
          Email: req.body.Email,
          Birthday: req.body.Birthday,
        },*/
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
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on Port ' + port);
});
