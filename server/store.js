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

  this.values = async () => _map.values();

}

const store = module.exports = {
  user: new AsyncMap,
  client: new AsyncMap,
  accessToken: new AsyncMap,
  refreshToken: new AsyncMap,
  authorizationCode: new AsyncMap
};

const {PROTOCOL, AUTH_SERVER, CLIENT_SERVER} = require('../config');

store.client.set('abc', {
  id: 'abc',
  name: 'test app',
  secret: '123',
  redirectUris: [`${PROTOCOL}//${CLIENT_SERVER}/auth/test/callback`], // optional
  grants: ['refresh_token', 'authorization_code'],
  accessTokenLifetime: undefined, // optional
  refreshTokenLifetime: undefined, // optional
  protected: true // todo set owner to clients
}).catch(console.error);
