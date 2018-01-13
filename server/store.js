/**
 * @constructor
 */
function AsyncMap() {

  const _map = new Map;

  this.clear = async () => _map.clear();
  this.delete = async (key) => _map.delete(key);
  this.forEach = async (fn) => _map.forEach(fn);

  this.get = async (key) => _map.get(key);
  this.has = async (key) => _map.has(key);
  this.set = async (key, val) => (_map.set(key, val), this);

  Object.defineProperty(this, "size", {
    get: () => _map.size,
    set: () => undefined,
  });

}

const store = module.exports = {
  user: new Map,
  client: new Map,
  accessToken: new Map,
  refreshToken: new Map,
  authorizationCode: new Map
};

store.client.set('abc', {
  id: 'abc',
  name: 'test app',
  secret: '123',
  redirectUris: ['http://localhost:8080/auth/test/callback'], // optional
  grants: ['refresh_token', 'authorization_code'],
  accessTokenLifetime: undefined, // optional
  refreshTokenLifetime: undefined // optional
});
