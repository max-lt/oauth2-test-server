const express = require('express');
const request = require('request-promise-native');
const cookieParser = require('cookie-parser');

require('express-async-errors');

const crypto = require('crypto');
const url = require('url');
const qs = require('querystring');

const clientOAuth2 = require('simple-oauth2');

const users = require('./store').user;
const login = require('./login');

const config = require('../config');

// express config

const app = express();

const mustacheRender = require('mustache-express')();
delete mustacheRender.cache;

app.use(cookieParser());

app.engine('mustache', mustacheRender);
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');

// end express config

app.use(login);

// credentials config

const {PROTOCOL, AUTH_SERVER, CLIENT_SERVER} = config;

// const {GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET} = config;
//
// const credentials = {
//   clientId: GITHUB_CLIENT_ID,
//   clientSecret: GITHUB_CLIENT_SECRET,
//   accessTokenUri: 'https://github.com/login/oauth/access_token',
//   authorizationUri: 'https://github.com/login/oauth/authorize',
//   redirectUri: `http://${CLIENT_SERVER}/auth/test/callback`,
//   scope: ['user', 'notifications'],

//   userInfoUri: 'https://api.github.com/user',
//   userNotificationsUri: 'https://api.github.com/notifications'
// };

const credentials = {
  clientId: 'abc',
  clientSecret: '123',
  accessTokenUri: `${PROTOCOL}//${AUTH_SERVER}/oauth/access_token`,
  authorizationUri: `${PROTOCOL}//${AUTH_SERVER}/oauth/authorize`,
  redirectUri: `${PROTOCOL}//${CLIENT_SERVER}/auth/test/callback`,
  scope: ['user', 'notifications'],

  userInfoUri: `${PROTOCOL}//${AUTH_SERVER}/me`,
  userNotificationsUri: `${PROTOCOL}//${AUTH_SERVER}/notifications`
};

function parseCredentials(c) {
  const tokenUrl = url.parse(c.accessTokenUri);
  const authorizationUrl = url.parse(c.authorizationUri);
  return {
    client: {
      id: c.clientId,
      secret: c.clientSecret,
    },
    auth: {
      tokenHost: tokenUrl.protocol + '//' + tokenUrl.host,
      tokenPath: tokenUrl.path,
      authorizePath: authorizationUrl.path,
    }
  }
}

const testAuth = clientOAuth2.create(parseCredentials(credentials));

// end credentials config

function getRemoteUserData(token, userInfoUri) {
  return request({
    uri: userInfoUri,
    headers: {
      'User-Agent': 'request'
    },
    auth: {
      bearer: token
    },
    json: true
  }).catch((error) => {
    console.log('client:', 'Request err (getRemoteUserData)', error.message);
    throw error;
  });
}

const handler = () => (req, res, next) => 0;

app.get('/', async (req, res) => {
  const user = req.user;

  if (!user)
    return res.render('main', {serverUri: AUTH_SERVER});

  const token = user.token.access_token;

  const scope = {};

  // get user data
  try {
    const u = await getRemoteUserData(token, credentials.userInfoUri);
    console.log({u});
    Object.assign(scope, {user: '' + (u.login || u.name || u.id)});
  } catch (e) {
    Object.assign(scope, {user: Object.assign({code: e.response.statusCode}, e.response.body)});
  }
  // end

  // get user notifications
  try {
    const notifications = await getRemoteUserData(token, credentials.userNotificationsUri);
    Object.assign(scope, {notifications});
  } catch (e) {
    Object.assign(scope, {notifications: Object.assign({code: e.response.statusCode}, e.response.body)});
  }
  // end

  // update user
  users.set(user.id, user);

  res.render('main', {user: user, user_pre: JSON.stringify({scope, user}, null, 2), serverUri: AUTH_SERVER});
});

app.use('/', express.static(__dirname + '/static'));

app.get('/auth/test', (req, res) => {
  const scope = req.query.scope;

  console.log('client:', {scope});

  const authorizationUri = testAuth.authorizationCode.authorizeURL({
    redirect_uri: credentials.redirectUri,
    // https://tools.ietf.org/html/rfc6749#section-3.3
    scope: scope || credentials.scope.join(' '),
    state: crypto.randomBytes(4).toString('hex')
  });
  console.log('client:', {authorizationUri});
  res.redirect(authorizationUri);
});

app.get('/auth/test/callback', async (req, res) => {
  const {code, error} = req.query;
  const options = {code};

  if (error) {
    console.log('client:', `cb called with error ${error}`);
    return res.redirect('/?' + qs.encode({error}));
  }

  console.log('client:', `cb called with code ${code}`);

  const tokenConfig = {
    code: code,
    redirect_uri: credentials.redirectUri
  };

  console.log('client:', 'tokenConfig', tokenConfig);

  const result = await testAuth.authorizationCode.getToken(tokenConfig);

  const accessToken = testAuth.accessToken.create(result);

  if (accessToken.error) {
    console.warn('client:', 'token error', accessToken);
    throw accessToken;
  }

  console.log('client:', {accessToken});

  // just create a session with token

  const localUser = {id: crypto.randomBytes(8).toString('hex'), token: accessToken.token};

  users.set(localUser.id, localUser);

  console.log('client:', 'user:', localUser);

  res.cookie('test-oauth-client-user', localUser.id, {maxAge: 900000, httpOnly: true});
  res.redirect('/');

});

app.use((error, req, res, next) => {
  console.error('client: Error:', error);
  res.status(error.code || 500).send(error)
});

app.listen(8080);
