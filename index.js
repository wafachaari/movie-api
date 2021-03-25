const express = require('express'), morgan = require('morgan');

const app = express();

app.use(morgan('common'));
app.use(express.static('public'));
const topMovies = [
  {
    title: 'Forrest Gump',
  },
  {
    title: 'Cast Away',
  },
  {
    title: 'The Imitation Game',
  },
  {
    title: 'Shawshank Redemption',
  },
  {
    title: 'Saving Private Ryan',
  },
  {
    title: "A Knight's Tale",
  },
  {
    title: 'Good Will Hunting',
  },
  {
    title: 'A Beautiful Mind',
  },
  {
    title: 'Passion of the Christ',
  },
  {
    title: 'Iron Man',
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

app.get('/movies', (req, res) => {
  res.json(topMovies);
});

// listen for requests
app.listen(8080, () => {
  console.log('Your app is listening on port 8080.');
});
