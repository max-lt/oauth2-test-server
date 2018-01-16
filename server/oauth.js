const qs = require('querystring');
const router = require('express').Router();

const oauthServer = require('oauth2-server');

const AccessDeniedError = require('oauth2-server/lib/errors/access-denied-error');
const OAuthError = require('oauth2-server/lib/errors/oauth-error');
const {Request, Response} = oauthServer;

const AuthorizeHandler = require('oauth2-server/lib/handlers/authorize-handler');

const model = require('./model');
const store = require('./store');

const authenticate = function (options) {
  return function (req, res, next) {
    let request = new Request(req);
    let response = new Response(res);
    return oauth.authenticate(request, response, options)
      .then((token) => {

        const user = store.user.get(token.user.id);

        res.oauth = {token, user};

        next();
      })
      .catch(next);
  }
};

const authenticateHandler = {
  handle: (request, response) => request.user
};

// https://github.com/manjeshpv/node-oauth2-server-implementation/blob/master/components/oauth/models.js
const oauth = new oauthServer({model});
const checkClient = AuthorizeHandler.prototype.getClient.bind({model});

router.all('/oauth/access_token', (req, res, next) => {
  const request = new Request(req);
  const response = new Response(res);

  oauth
    .token(request, response)
    .then((token) => {

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
    })
    .catch((err) => {
      console.log('server:', 'error:', err);
      next(err);
    })
});

// Get authorization.
router.get('/oauth/authorize', (req, res, next) => {
  const {response_type, client_id, redirect_uri, scope, state} = req.query;

  const client = store.client.get(client_id);

  if (!client)
    return res.status(404).send('Client not found');

  console.log('server:', 'user:', JSON.stringify(req.user));

  // Redirect anonymous users to login page.
  if (!req.user)
    return res.redirect(`/login?redirect=${req.path}&${qs.encode(req.query)}`);

  const user = req.user;

  // If user already approved client app. todo: check for scopes too
  if (user.authorizedClients.find(({id}) => id === client_id)) {
    const request = new Request(req);
    const response = new Response(res);

    return oauth.authorize(request, response, {authenticateHandler, allowEmptyState: true})
      .then((code) => {
        console.log('server:', `user:${user.id} already approved client:${client_id}`);
        res.redirect(`${code.redirectUri}/?code=${code.authorizationCode}`) // todo add state
      })
      .catch((err) => {
        console.log('server:', err);
        next(err);
      })
  }

  const app_name = client.name; // todo

  return res.render('authorize', {user, app_name, client_id, redirect_uri, scope: scope.split(/[ ,]/)});
});

router.post('/oauth/authorize', (req, res, next) => {

  if (!req.user)
    return res.status(403).send('Unauthorized');

  // copy post response to the library expected format
  // https://oauth2-server.readthedocs.io/en/latest/api/oauth2-server.html#authorize-request-response-options-callback
  req.query.allowed = req.body.user_allows;

  const request = new Request(req);
  const response = new Response(res);

  (async () => {
    // => {"authorizationCode":"...","expiresAt":"...","redirectUri":"...","scope":"...","client":{"id":"..."},"user":{"id":"..."}}
    const code = await oauth.authorize(request, response, {authenticateHandler, allowEmptyState: true});

    console.info('server:', 'code:', code);

    // saving client to user's approved clients
    const user = store.user.get(code.user.id);

    if (!user)
      throw new Error('Could not find referenced user');

    user.authorizedClients.push({id: code.client.id, scope: code.scope});

    store.user.set(code.user.id, user);
    // end

    res.redirect(`${code.redirectUri}/?code=${code.authorizationCode}`) // todo add state

  })().catch(async (error) => {

    console.log('server:', {error});

    if (error instanceof AccessDeniedError) {

      const {redirect_uri} = req.query;

      // We want to redirect the user to the client but we need to checks that the requested client
      // exists and that the provided redirect_uri is valid because the library checks the user's rejection
      // before checking the client validity.

      // We use AuthorizeHandler.prototype.getClient to do that
      // @see /node_modules/oauth2-server/lib/handlers/authorize-handler.js
      const client = await checkClient(request).catch(next);

      return res.redirect(`${redirect_uri}/?${qs.encode({error: error.name, error_description: error.message})}`) // todo add state
    }

    next(error);
  })

});

router.use((error, req, res, next) => {
  if (!(error instanceof OAuthError))
    return res.status(error.code || 500).send({error});

  const oauthError = {error: error.name, error_description: error.message};

  res.status(error.code || 500).send(oauthError)
});

module.exports = router;
module.exports.authenticate = authenticate;
