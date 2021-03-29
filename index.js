const express = require('express'),
  bodyParser = require('body-parser'),
  uuid = require('uuid');

const app = express();
const morgan = require('morgan');

app.use(bodyParser.json());

app.use(morgan('common'));
app.use(express.static('public'));
let users = [
  {
    username: 'user1',
    email: 'email',
    favoriteMovies: {title: 'tiltefavorite'},
  },
  {
    username: 'user2',
    email: 'email2',
    favoriteMovies: {title: 'tiltefavorite'},
  },
];
let movies = [
  {
    title: 'Forrest',
    genre: 'genre 1',
    director: {
      name: ' directorname',
    },
  },
  {
    title: 'Cast Away',
    genre: 'genre 1',
    director: {
      name: ' directorname',
    },
  },
  {
    title: 'The Imitation Game',
    genre: 'genre 1',
    director: {
      name: ' directorname',
    },
  },
  {
    title: 'Shawshank Redemption',
    genre: 'genre 1',
    director: {
      name: ' directorname',
    },
  },
];
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
app.get('/movies', (req, res) => {
  res.send('Successful GET request returning data on all movies');
});

//Return data (description, genre, director, image URL, whether it’s featured or not) about a single movie by title to the user
app.get('/movies/:title', (req, res) => {
  res.json(
    movies.find(movie => {
      return movie.title === req.params.title;
    }),
  );
});

//Return data about a genre (description) by name/title (e.g., “Thriller”)

app.get('/movies/:title/genre', (req, res) => {
  res.send('data is being returned- genre');
});

//Return data about a director (bio, birth year, death year) by name
app.get('/movies/:title/director', (req, res) => {
  res.send('Director is being fetched');
});
//Allow new users to register

app.post('/users', (req, res) => {
  let newUser = req.body;
  if (!newUser.username) {
    const message = 'Missing name in request body';
    res.status(400).send(message);
  } else {
    newUser.id = uuid.v4();
    users.push(newUser);
    res.status(201).send(newUser);
  }
});
//Allow users to update their user info (username)
app.put('/users/:username', (req, res) => {
  res.send('User has been updated');
});
//Allow users to add a movie to their list of favorites (showing only a text that a movie has been added—more on this later)
app.put('/users/:username/favoriteMovies', (req, res) => {
  res.send(' movie has been added');
});

// Gets the data about a single user, by name

app.get('/users/:username', (req, res) => {
  res.json(
    users.find(user => {
      return user.username === req.params.username;
    }),
  );
});
//Allow users to remove a movie from their list of favorites (showing only a text that a movie has been removed—more on this later)

app.put('/users/:username/favoriteMovies', (req, res) => {
  res.send(' movie has been deleted');
});

//Allow existing users to deregister (showing only a text that a user email has been removed—more on this later)

app.put('/users/:username', (req, res) => {
  res.send(' email has been removed');
});

// listen for requests
app.listen(8080, () => {
  console.log('Your app is listening on port 8080.');
});
