const env = process.env;

const expected = ['AUTH_SERVER', 'CLIENT_SERVER'];
const optional = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'PROTOCOL'];

const config = {};

const PROTOCOL = ((p = env.PROTOCOL || 'http:') => p.endsWith(':') ? p : p + ':')();

for (let e of expected)
  env[e] ? (config[e] = env[e]) : console.warn(`Missing expected env ${e}`);

for (let e of optional)
  env[e] ? (config[e] = env[e]) : console.warn(`Missing optional env ${e}`);

module.exports = Object.assign({PROTOCOL}, config);
