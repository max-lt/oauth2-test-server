const express = require('express');
const request = require('request-promise-native');
const cookieParser = require('cookie-parser');

const crypto = require('crypto');
const url = require('url');
const qs = require('querystring');

const clientOAuth2 = require('simple-oauth2');

const users = require('./store').user;
const login = require('./login');

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

const AUTH_SERVER = 'localhost:8090';
const THIS_SERVER = 'localhost:8080';

// const {GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET} = process.env;
//
// const credentials = {
//   clientId: GITHUB_CLIENT_ID,
//   clientSecret: GITHUB_CLIENT_SECRET,
//   accessTokenUri: 'https://github.com/login/oauth/access_token',
//   authorizationUri: 'https://github.com/login/oauth/authorize',
//   redirectUri: `http://${THIS_SERVER}/auth/test/callback`,
//   userInfoUri: 'https://api.github.com/user',
//   scopes: ['notifications', 'gist', 'user:email']
// };

const credentials = {
  clientId: 'abc',
  clientSecret: '123',
  accessTokenUri: `http://${AUTH_SERVER}/oauth/access_token`,
  authorizationUri: `http://${AUTH_SERVER}/oauth/authorize`,
  redirectUri: `http://${THIS_SERVER}/auth/test/callback`,
  userInfoUri: `http://${AUTH_SERVER}/me`,
  scopes: ['user']
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
    console.trace('client:', 'Request err (getRemoteUserData)', error);
    throw error;
  });
}

const handler = () => (req, res, next) => 0;

app.get('/', (req, res) => res.render('main', {user: req.user}));

app.use('/', express.static(__dirname + '/static'));

app.get('/auth/test', (req, res) => {
  const authorizationUri = testAuth.authorizationCode.authorizeURL({
    redirect_uri: credentials.redirectUri,
    scope: credentials.scopes.join(','),
    state: crypto.randomBytes(4).toString('hex')
  });
  console.log('client:', {authorizationUri});
  res.redirect(authorizationUri);
});

app.get('/auth/test/callback', function (req, res) {
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

  testAuth.authorizationCode.getToken(tokenConfig)
    .then((result) => {

      const accessToken = testAuth.accessToken.create(result);

      if (accessToken.error) {
        console.warn('client:', 'token error', accessToken);
        throw accessToken;
      }

      console.log('client:', 'token:', accessToken);

      return getRemoteUserData(accessToken.token.access_token, credentials.userInfoUri);
    })
    .then((user) => {
      // we got user data, just create a session

      const localUser = {name: '' + (user.login || user.name || user.id), id: '' + user.id};

      users.set(localUser.id, localUser);

      console.log('client:', 'user:', user);

      res.cookie('test-oauth-client-user', localUser.id, {maxAge: 900000, httpOnly: true});
      res.redirect('/');
    })
    .catch((error) => {
      console.trace('client:', 'Access Token Error', error.message);
      res.send({error})
    });

});

app.listen(8080);
