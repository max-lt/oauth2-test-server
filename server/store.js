const store = module.exports = {
  user: new Map,
  client: new Map,
  accessToken: new Map,
  refreshToken: new Map,
  authorizationCode: new Map
};

store.client.set('abc', {
  id: 'abc',
  secret: '123',
  redirectUris: ['http://localhost:8080/auth/test/callback'], // optional
  grants: ['refresh_token', 'authorization_code'],
  accessTokenLifetime: undefined, // optional
  refreshTokenLifetime: undefined // optional
});
