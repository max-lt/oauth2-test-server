const q = require('querystring');
const router = require('express').Router();

const users = require('./store').user;

router.use((req, res, next) => {

  const userId = req.cookies && req.cookies['test-oauth-client-user'];

  if (userId) {
    try {
      req.user = users.get(userId);
    } catch (e) {

    }
  }

  console.log('client:', `parse cookie ${userId} -> ${JSON.stringify(req.user)}`);

  next()
});

router.get('/logout', (req, res) => res.clearCookie('test-oauth-client-user').redirect('/'));

module.exports = router;
