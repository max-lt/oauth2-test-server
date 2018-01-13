const router = require('express').Router();

const crypto = require('crypto');

const store = require('./store');

router.get('/clients', (req, res) => {
  const clients = Array.from(store.client.values());
  console.log('server:', clients);
  res.render('clients', {clients});
});

router.get('/client/:id/resetSecret', (req, res) => {
  const clientId = req.params.id;
  const client = store.client.get(clientId);
  client.secret = crypto.randomBytes(20).toString('hex');
  store.client.set(client.id, client);
  res.redirect('/clients');
});

router.get('/client/:id/delete', (req, res) => {
  const clientId = req.params.id;
  const client = store.client.delete(clientId);
  res.redirect('/clients');
});

router.post('/client', (req, res) => {

  const {name, callbacks} = req.body;

  const client = {name};

  client.id = crypto.randomBytes(10).toString('hex');
  client.secret = crypto.randomBytes(20).toString('hex');
  client.redirectUris = callbacks.split(/[\r\n]+/g).map(e => e.trim());

  client.grants = ['refresh_token', 'authorization_code'];

  store.client.set(client.id, client);

  res.redirect('/clients');

});

module.exports = router;
