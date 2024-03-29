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

router.get('/revoke/:clientId', (req, res) => {
  const clientId = req.params.clientId;

  if (!clientId)
    return res.status(400).send('Bad request');

  if (!req.user)
    return res.status(403).send('Unauthorized');

  // remove client from authorized clients
  // saving client to user approved clients
  const user = store.user.get(req.user.id);

  if (!user)
    throw new Error('Could not find referenced user');

  const i = user.authorizedClients.findIndex(({id}) => id === clientId);

  if (i === -1)
    return res.status(404).send('Client not found');

  user.authorizedClients.splice(i, 1);

  store.user.set(req.user.id, user);
  // end

  res.redirect('/')
});

router.post('/login', (req, res) => {
  /**
   * @type {{login: string, password: string}}
   */
  const {login, password} = req.body;

  if (!login || !password)
    return res.status(400).send('Expected login & password');

  const userId = crypto.createHash('sha1').update(login).digest('hex'); // deterministic userId
  const user = {id: userId, login, password, authorizedClients: []};

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
