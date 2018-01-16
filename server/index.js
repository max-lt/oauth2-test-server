const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const OAuthError = require('oauth2-server/lib/errors/oauth-error');

const {CLIENT_SERVER} = require('../config');
const clientUri = CLIENT_SERVER || 'localhost:8080';

require('express-async-errors');

const app = express();

const store = require('./store');
const oauth = require('./oauth');
const login = require('./login');
const clients = require('./clients');

const authenticate = oauth.authenticate;

app.use(bodyParser.urlencoded({extended: true}));

app.use(bodyParser.json());

app.use(cookieParser());

const mustacheRender = require('mustache-express')();
delete mustacheRender.cache;

app.engine('mustache', mustacheRender);
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');

app.use(login);
app.use(oauth);
app.use(clients);

app.get('/', async (req, res) => {

  const user = req.user;

  if (!user)
    return res.render('main', {clientUri});

  const clients = [];

  for (let client of user.authorizedClients.values()) {
    clients.push(Object.assign({}, await store.client.get(client.id), {scope: client.scope.split(' ')}));
  }

  res.render('main', {user, clients, clientUri})
});

app.use('/', express.static(__dirname + '/static'));

app.get('/secure', authenticate(), (req, res) => {
  res.json({message: 'Secure data'})
});

app.get('/public', (req, res) => {
  // Does not require an access_token.
  res.send('Public area');
});

app.get('/me', authenticate({scope: 'user'}), (req, res) => {
  res.json(Object.assign({}, res.oauth.user, {
    message: 'Authorization success, Without Scopes, Try accessing /profile with `profile` scope',
    description: 'Try postman https://www.getpostman.com/collections/37afd82600127fbeef28',
    more: 'pass `profile` scope while Authorize'
  }))
});

app.get('/notifications', authenticate({scope: 'notifications'}), (req, res) => {
  res.json([])
});

app.get('/profile', authenticate({scope: 'profile'}), (req, res) => {
  res.json({
    profile: res.oauth.user
  })
});

app.use((error, req, res, next) => {
  if (!(error instanceof OAuthError))
    return res.status(error.code || 500).send({error});

  const oauthError = {error: error.name, error_description: error.message};

  res.status(error.code || 500).send(oauthError)
});

app.listen(8090);
