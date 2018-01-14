const qs = require('querystring');
const router = require('express').Router();
const Layer = require('express/lib/router/layer');

const oauthServer = require('oauth2-server');

const AccessDeniedError = require('oauth2-server/lib/errors/access-denied-error');
const OAuthError = require('oauth2-server/lib/errors/oauth-error');

const AuthorizeHandler = require('oauth2-server/lib/handlers/authorize-handler');

// todo access store from a model
const store = require('./store');
const model = require('./model');

const wrap = require('./wrap');
const misc = require('./misc');

const authenticate = function (options) {
  return async function (req, res, next) {
    const token = await wrap.authenticate(req, res, options);

    const user = await store.user.get(token.user.id);

    res.oauth = {token, user};

    next();
  }
};

router.all('/oauth/access_token', async (req, res, next) => {

  const token = await wrap.token(req, res);

  console.log('server:', 'token:', {token});

  // https://tools.ietf.org/html/rfc6749.html#section-5.1
  // https://tools.ietf.org/html/rfc6749.html#section-4.1.4
  return res.json({
    access_token: token.accessToken,
    token_type: 'bearer',
    expires_in: token.accessTokenExpiresAt,
    refresh_token: token.refreshToken,
    scope: token.scope
  })

});

// Get authorization.
router.get('/oauth/authorize', async (req, res, next) => {
  const {response_type, client_id, redirect_uri, scope: requestedScope, state} = req.query; // todo: validate scope

  const client = await store.client.get(client_id);

  if (!client)
    return res.status(404).send('Client not found');

  console.log('server:', 'user:', JSON.stringify(req.user));

  // Redirect anonymous users to login page.
  if (!req.user)
    return res.redirect(`/login?redirect=${req.path}&${qs.encode(req.query)}`);

  const user = req.user;

  // If user already approved client app AND scope already approved.
  const authorizedClient = user.authorizedClients.get(client_id);
  if (authorizedClient && misc.allIn(authorizedClient.scope, requestedScope)) {
    const code = await wrap.authorize(req, res);
    console.log('server:', `user:${user.id} already approved client:${client_id}`);
    return res.redirect(`${code.redirectUri}/?code=${code.authorizationCode}`) // todo add state
  }

  const app_name = client.name; // todo

  return res.render('authorize', {user, app_name, client_id, redirect_uri, scope: requestedScope.split(/[ ,]/)});
});

router.post('/oauth/authorize', async (req, res, next) => {

    if (!req.user)
      return res.status(403).send('Unauthorized');

    // copy post response to the library expected format
    // https://oauth2-server.readthedocs.io/en/latest/api/oauth2-server.html#authorize-request-response-options-callback
    req.query.allowed = req.body.user_allows;

    // => {"authorizationCode":"...","expiresAt":"...","redirectUri":"...","scope":"...","client":{"id":"..."},"user":{"id":"..."}}
    const code = await wrap.authorize(req, res);

    console.info('server:', 'code:', code);

    // saving client to user's approved clients
    await misc.updateUser(code.user.id, (user) => {
      const clients = user.authorizedClients;
      const client = clients.get(code.client.id);
      if (!client)
        clients.set(code.client.id, {id: code.client.id, scope: code.scope});
      else
        clients.set(client.id, {id: client.id, scope: misc.dropDuplicates(client.scope + ' ' + code.scope)});

      return user;
    });
    // end

    res.redirect(`${code.redirectUri}/?code=${code.authorizationCode}`) // todo add state

  }, // Route specific error handler
  async (error, req, res, next) => {

    console.log('server: Error (/oauth/authorize)', {error});

    if (error instanceof AccessDeniedError) {

      const {redirect_uri} = req.query;

      // We want to redirect the user to the client but we need to checks that the requested client
      // exists and that the provided redirect_uri is valid because the library checks the user's rejection
      // before checking the client validity.

      // We use AuthorizeHandler.prototype.getClient to do that
      // @see /node_modules/oauth2-server/lib/handlers/authorize-handler.js
      const client = await wrap.checkClient(req);

      return res.redirect(`${redirect_uri}/?${qs.encode({error: error.name, error_description: error.message})}`) // todo add state
    }

    throw error;

  }
);

module.exports = router;
module.exports.authenticate = authenticate;
