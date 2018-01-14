const oauthServer = require('oauth2-server');

const AccessDeniedError = require('oauth2-server/lib/errors/access-denied-error');
const OAuthError = require('oauth2-server/lib/errors/oauth-error');
const {Request, Response} = oauthServer;

const AuthorizeHandler = require('oauth2-server/lib/handlers/authorize-handler');

const model = require('./model');
const store = require('./store');

const authenticateHandler = {
  handle: (request, response) => request.user
};

// https://github.com/manjeshpv/node-oauth2-server-implementation/blob/master/components/oauth/models.js
const oauth = new oauthServer({model});
const checkClient = AuthorizeHandler.prototype.getClient.bind({model});

module.exports = {

  token: (req, res) => {
    const request = new Request(req);
    const response = new Response(res);

    return oauth.token(request, response);
  },

  authorize: (req, res) => {
    const request = new Request(req);
    const response = new Response(res);

    return oauth.authorize(request, response, {authenticateHandler, allowEmptyState: true});
  },

  checkClient: (req) => {
    const request = new Request(req);

    return checkClient(request);
  },

  authenticate: (req, res, options) => {
    const request = new Request(req);
    const response = new Response(res);

    return oauth.authenticate(request, response, options);
  },

};
