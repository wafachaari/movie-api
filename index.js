const mongoose = require('mongoose');
const Models = require('./models.js');
const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid');
const morgan = require('morgan');
const passport = require('passport');
require('./passport');
const cors = require('cors');
require('dotenv').config();
let allowedOrigins = [
  'http://localhost:8080/',
  'https://movie-api-db-30.herokuapp.com/',
  'http://localhost:1234/',
  'http://localhost:1234',
  'http://localhost:1234/register',
  'https://quirky-lewin-5d26cc.netlify.app/',
  'http://localhost:4200/',
  'http://localhost:4200',
  '*',
  'https://wafachaari.github.io',
  'https://wafachaari.github.io/',
  'https://wafachaari.github.io/myFlix-Angular-Client',
  'https://wafachaari.github.io/myFlix-Angular-Client/',
  'https://wafachaari.github.io/myFlix-Angular-Client/movies',
];

const app = express();
app.use(express.json());
app.use(bodyParser.json());

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
let auth = require('./auth')(app);
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

/**
 @function get All Movies
@description get All movies from the database
@returns {JSON} JSON object of all movies, each of which contain the movie's title, description, director, genre, image url, and featured status.
*/
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

/**
@function Get a single movie
@description Gets a specific movie in the database.
@returns {JSON} JSON object of the movie containing the movie's title, description, director, genre, image url, and featured status.
*/
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
/**
 * @function GET specific Genre by name
 * @description Gets specific Genre by name based on client request
    * @returns {JSON} JSON object of genre containing genres name and description.
 */
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
/**
 * @function GET director by name
 * @description Gets specific director as requested by client by name
   * @param {string} '/directors/:Name' directors endpoint with a specific director requested by client
 * @param {object} JWT bearer JSON web token passed into HTTP request from client
 * @returns {JSON} JSON object of director containing,
 * director name, picture, bio, birth and death years where available
 */
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
/**
 * @function Create a user
 * @description Create user in database. No JSON Web Token needed. New users get JWT once created
 * IDs are also automatically generated, users do not need to add their own ID do not add this field
 * @example
 * axios({
 *  method: 'post',
  * Example request:
   {
           "Username": "wafa chaari",
           "Password": "wafa",
           "Email": "wafachaari@hotmail.fr",
           "Birthday": "09/05/2003"

        }
 * })
 * @param {string} '/users' users endpoint requested by client
 * @param {JSON} User the user JSON object containing username, password, email, and birthday
 * @returns {JSON} JSON object of new user containing new user's username, hashed password, email, and birthday
 */
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

/**
@function Get all users
@description Gets all the users from the database.
 *@param {String} '/users' The users endpoint requested by the client.
*@param {Object} jwt The bearer json web token passed into the HTTP request from the client.
@returns {JSON} JSON object containing all users, each of which contain the name, username, hashed password, email, birthday, and favorite movies
*/
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
/**
@function Update a user
@description Update a user's information in the database.
@example
 axios({
      method: 'put',
           headers: { 'Authorization': `Bearer ${token}` },
      data: {
            "Username": "wafa chaari",
            "Password": "wafa45",
            "Email": "wafachaari@hotmail.fr",
            "Birthday": "09/05/2003"

         }
})
*@param {String} '/users/:username' The users endpoint and specific username requested by the client.
*@param {Object} jwt The bearer json web token passed into the HTTP request from the client.
*@param {JSON} user The user json object containing the updated name, username, password, email, and/or birthday.
@returns {JSON} JSON object containing the updated name, username, hashed password, email, and/or birthday for the user.
*/
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

/**
 @function Add movie to user favorites
 @description Adds a movie to a specific user's favorites.
 @example
  axios({
      method: 'post',
      url: 'https://movie-api.herokuapp.com/client/users/wafa/Movies/12345678',
      headers: { 'Authorization': `Bearer ${token}` }
})
 *@param {String} '/users/:user/Movies/:MovieID' The users endpoint with a specific user and movie ID.
 *@param {Object} jwt The bearer json web token passed into the HTTP request from the client.
 @returns {Object} Returns the new user object with name, username, hashed password, email, birthday, and new favorites.
 */
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
/**
 @function Get a single user
 @description Gets a specific user from the database.
 @example
  axios({
    method: 'get',
    url: 'https://movie-api.herokuapp.com/client/users/sssss',
    {
      headers: { Authorization: `Bearer ${token}`
    }
})
 *@param {String} '/users/:user' The users endpoint and specific user requested by the client.
 *@param {Object} jwt The bearer json web token passed into the HTTP request from the client.
 @returns {JSON} JSON object containing the user's name, username, hashed password, email, birthday, and favorite movies
 */
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
/**
 @function Delete a movie from user favorites
 @description Removes a movie to from a specific user's favorites.
 @example
  axios({
      method: 'delete',
      url: 'https://movie-api.herokuapp.com/client/users/ssss/Movies/12345678',
      headers: { 'Authorization': `Bearer ${token}` }
})
 *@param {String} '/users/:user/Movies/:MovieID' The users endpoint with a specific user and movie ID.
 *@param {Object} jwt The bearer json web token passed into the HTTP request from the client.
 @returns {Object} Returns the new user object with name, username, hashed password, email, birthday, and new favorites (if any).
 */
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
/**
 @function Delete a user
 @description Removes a specific user from the database.
 @example
    axios({
      method: 'delete',
      url: 'https://movie-api.herokuapp.com/client/users/jjjk',
      headers: { 'Authorization': `Bearer ${token}` }
})
 *@param {String} '/users/:user' The users endpoint with a specific user.
 *@param {Object} jwt The bearer json web token passed into the HTTP request from the client.
 @returns {String} Returns a string indicating the user has been deleted.
 */
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
