const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const app = express();

const store = require('./store');
const oauth = require('./oauth');
const login = require('./login');

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

app.get('/', (req, res) => {

  const user = req.user;

  if (!user)
    return res.render('main');

  const clients = [];

  for (let client of user.authorizedClients) {
    clients.push(Object.assign({}, store.client.get(client.id), {scope: client.scope.split(' ')}));
  }

  res.render('main', {user, clients})
});

app.use('/', express.static(__dirname + '/static'));

app.get('/secure', authenticate(), (req, res) => {
  res.json({message: 'Secure data'})
});

app.get('/public', (req, res) => {
  // Does not require an access_token.
  res.send('Public area');
});

app.get('/me', authenticate(), (req, res) => {
  res.json(Object.assign({}, res.oauth.user, {
    message: 'Authorization success, Without Scopes, Try accessing /profile with `profile` scope',
    description: 'Try postman https://www.getpostman.com/collections/37afd82600127fbeef28',
    more: 'pass `profile` scope while Authorize'
  }))
});

app.get('/profile', authenticate({scope: 'profile'}), (req, res) => {
  res.json({
    profile: res.oauth.user
  })
});

app.listen(8090);
