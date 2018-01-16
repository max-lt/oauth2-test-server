const router = require('express').Router();

const crypto = require('crypto');

const store = require('./store');

router.get('/clients', async (req, res) => {
  const clients = Array.from(await store.client.values());
  console.log('server:', clients);
  res.render('clients', {clients});
});

router.get('/client/:id/resetSecret', async (req, res) => {
  const clientId = req.params.id;
  const client = await store.client.get(clientId);
  if (!client)
    return res.status(404).send('Client not found');
  if (client.protected)
    return res.status(401).send('Protected');
  client.secret = crypto.randomBytes(20).toString('hex');
  await store.client.set(client.id, client);
  res.redirect('/clients');
});

router.get('/client/:id/delete', async (req, res) => {
  const clientId = req.params.id;
  const client = await store.client.get(clientId);
  if (!client)
    return res.status(404).send('Client not found');
  if (client.protected)
    return res.status(401).send('Protected');
  await store.client.delete(clientId);
  res.redirect('/clients');
});

router.post('/client', async (req, res) => {

  const {name, callbacks} = req.body;

  const client = {name};

  client.id = crypto.randomBytes(10).toString('hex');
  client.secret = crypto.randomBytes(20).toString('hex');
  client.redirectUris = callbacks.split(/[\r\n]+/g).map(e => e.trim());

  client.grants = ['refresh_token', 'authorization_code'];

  await store.client.set(client.id, client);

  res.redirect('/clients');

});

module.exports = router;
