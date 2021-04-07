const jwtSecret = 'your_jwt_secret'; // Corresponds to JWTStrategy key in passport.js

const jwt = require('jsonwebtoken'), passport = require('passport');

require('./passport');

let generateJWTToken = user => {
  return jwt.sign(user, jwtSecret, {
    subject: user.Username, //the username being encoded in the JWT
    expiresIn: '7d', //specifies that the token will expire in 7 days
    algorithm: 'HS256', //the algorithm used to encode the values of the JWT
  });
};

//POST request for logins
module.exports = router => {
  router.post('/login', (req, res) => {
    passport.authenticate('local', {session: false}, (error, user, info) => {
      if (error || !user) {
        return res.status(400).json({
          message: 'Something is not right',
          user: user,
        });
      }
      req.login(user, {session: false}, error => {
        if (error) {
          res.send(error);
        }
        let token = generateJWTToken(user.toJSON());
        return res.json({user, token});
      });
    })(req, res);
  });
};
