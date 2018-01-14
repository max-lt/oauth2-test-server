const store = require('./store');
const misc = require('./misc');

const clientStore = store.client;
const accessTokenStore = store.accessToken;
const refreshTokenStore = store.refreshToken;
const authorizationCodeStore = store.authorizationCode;

/**
 * @param token
 * @param client
 * @param user
 * @return {{access_token, expires_at, scope, client_id, user_id}}
 */
function serialiseAccessToken(token, client, user) {
  return {
    access_token: token.accessToken,
    expires_at: token.accessTokenExpiresAt,
    scope: token.scope,
    client_id: client.id,
    user_id: user.id
  }
}

/**
 * @param token
 * @return {{accessToken, accessTokenExpiresAt, scope, client: {id: string}, user: {id: string}} || null}
 */
function deserialiseAccessToken(token) {

  if (!token)
    return null;

  return {
    accessToken: token.access_token,
    accessTokenExpiresAt: token.expires_at,
    scope: token.scope,
    client: {
      id: token.client_id
    },
    user: {
      id: token.user_id
    }
  }
}

/**
 * @param token
 * @param client
 * @param user
 * @return {{refresh_token, expires_at, scope, client_id, user_id}}
 */
function serialiseRefreshToken(token, client, user) {
  return {
    refresh_token: token.refreshToken,
    expires_at: token.refreshTokenExpiresAt,
    scope: token.scope,
    client_id: client.id,
    user_id: user.id
  }
}

/**
 * @param token
 * @return {{refreshToken, refreshTokenExpiresAt, scope, client: {id: string}, user: {id: string}} || null}
 */
function deserialiseRefreshToken(token) {

  if (!token)
    return null;

  return {
    refreshToken: token.refresh_token,
    refreshTokenExpiresAt: token.expires_at,
    scope: token.scope,
    client: {
      id: token.client_id
    },
    user: {
      id: token.user_id
    }
  }
}

/**
 *
 * @param code
 * @param client
 * @param user
 * @return {{authorization_code, expires_at, redirect_uri, scope, client_id, user_id}}
 */
function serialiseAuthorizationCode(code, client, user) {
  return {
    authorization_code: code.authorizationCode,
    expires_at: code.expiresAt,
    redirect_uri: code.redirectUri,
    scope: code.scope,
    client_id: client.id,
    user_id: user.id
  }
}

/**
 *
 * @param code
 * @return {*}
 */
function deserialiseAuthorizationCode(code) {

  if (!code)
    return null;

  return {
    authorizationCode: code.authorization_code,
    expiresAt: code.expires_at,
    redirectUri: code.redirect_uri,
    scope: code.scope,
    client: {id: code.client_id},
    user: {id: code.user_id}
  };
}

const model = module.exports = {

  saveToken: async (token, client, user) => {
    console.log('server:', 'Saving token', {token, client, user});

    await accessTokenStore.set(token.accessToken, serialiseAccessToken(token, client, user));

    await refreshTokenStore.set(token.refreshToken, serialiseRefreshToken(token, client, user));

    return Object.assign(token, {client: {id: client.id}, user});
  },

  getAccessToken: async (accessToken) => {
    console.log('server:', 'Get access token', accessToken);

    return deserialiseAccessToken(await accessTokenStore.get(accessToken))
  },

  getRefreshToken: async (refreshToken) => {
    console.log('server:', 'Get refresh token', refreshToken);

    return deserialiseRefreshToken(await refreshTokenStore.get(refreshToken))
  },

  getClient: async (clientId, clientSecret) => {
    console.log('server:', 'Get client', clientId, clientSecret);

    const cli = await clientStore.get(clientId);

    if (!cli) {
      console.log('server:', `Client ${clientId} not found`);
      return false;
    }

    if (clientSecret && cli.secret !== clientSecret) {
      console.log('server:', `Client ${clientId} provided bad secret`);
      return false;
    }

    console.log('server:', `   -> ${JSON.stringify(cli)}`);

    return cli;
  },

  // getUser: async (username, password) => {
  //   console.log('server:', 'Get user', username, password);
  //
  // },

  saveAuthorizationCode: async (code, client, user) => {
    console.log('server:', 'Save authorization code', code, client, user);

    const s = serialiseAuthorizationCode(code, client, user);

    await authorizationCodeStore.set(code.authorizationCode, s);

    const ret = deserialiseAuthorizationCode(s);

    console.log('server:', '   ->', JSON.stringify(ret));

    return ret;
  },

  getAuthorizationCode: async (code) => {
    console.log('server:', `Get authorization code ${code}`);

    const ret = deserialiseAuthorizationCode(await authorizationCodeStore.get(code));

    console.log('server:', '   ->', JSON.stringify(ret));

    return ret;
  },

  revokeAuthorizationCode: async (code) => {
    console.log('server:', 'Revoke authorization code', code);

    return authorizationCodeStore.delete(code.authorizationCode);
  },

  // http://oauth2-server.readthedocs.io/en/latest/model/spec.html#validatescope-user-client-scope-callback
  // Invoked to check if the requested scope is valid for a particular client/user combination.
  // This model function is optional. If not implemented, any scope is accepted.
  validateScope: async (user, client, scope) => {
    console.log('server:', 'Validate scope', user, client, scope);

    // list of (server's) valid scopes
    const VALID_SCOPES = ['user', 'notifications', 'profile'];

    if (!misc.allIn(VALID_SCOPES, scope))
      return false;

    const fullUser = await store.user.get(user.id);

    const authorizedClient = fullUser.authorizedClients.get(client.id);

    const userAcceptedScope = misc.allIn(authorizedClient.scope, scope);

    console.log('server:', '   ->', {userAcceptedScope});

    return userAcceptedScope;
  },

  // http://oauth2-server.readthedocs.io/en/latest/model/spec.html#verifyscope-accesstoken-scope-callback
  // Invoked during request authentication to check if the provided access token was authorized the requested scopes.
  verifyScope: async (accessToken, scope) => {
    console.log('server:', 'Verify scope', accessToken, scope);

    if (!accessToken.scope)
      return false;

    let requestedScopes = scope.split(' ');
    let authorizedScopes = accessToken.scope.split(' ');

    return requestedScopes.every((s) => authorizedScopes.includes(s));
  }


};
