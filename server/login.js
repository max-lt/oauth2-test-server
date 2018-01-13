const q = require('querystring');
const crypto = require('crypto');
const router = require('express').Router();

const store = require('./store');

router.use((req, res, next) => {

  const userId = req.cookies && req.cookies['test-oauth-user'];

  if (userId) {
    try {
      req.user = store.user.get(userId);
    } catch (e) {

    }
  }

  console.log(`server: parse cookie ${userId} -> ${JSON.stringify(req.user)}`);

  next()
});

router.get('/login', (req, res) => res.render('login', {}));

router.get('/logout', (req, res) => res.cookie('test-oauth-user', '', {maxAge: -1, httpOnly: true}).redirect('/'));

router.post('/login', (req, res) => {
  /**
   * @type {{login: string, password: string}}
   */
  const user = req.body;

  if (!user.login || !user.password) {
    return res.status(400).send('Expected login & password');
  }

  user.id = crypto.createHash('sha1').update(user.login).digest('hex'); // deterministic userId

  if (store.user.has(user.id)) {
    // restore stored used
    Object.assign(user, store.user.get(user.id))
  } else {
    // register new user
    store.user.set(user.id, user);
  }

  res.cookie('test-oauth-user', user.id, {maxAge: 900000, httpOnly: true});

  const forward = Object.assign({}, req.query);
  const redirect = forward.redirect;
  delete forward.redirect;

  res.redirect((redirect || '/') + "?" + q.encode(forward));

});


module.exports = router;
