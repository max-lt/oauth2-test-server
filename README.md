# Express OAuth2 Client/Server example

This projects implements:
 
 - An OAuth2 server with [oauth2-server](https://www.npmjs.com/package/oauth2-server) and [express](https://www.npmjs.com/package/express).
 - A client app with [simple-oauth2](https://www.npmjs.com/package/simple-oauth2) and [express](https://www.npmjs.com/package/express).

## Installation

    $ git clone https://github.com/maxx-t/oauth2-test-server

## Quick Start

#### Run the client:
```bash
node client
```

The client will listen on port 8080.

###### Note that the client can perform a request to github (commented code), if you want to test this you have to set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` environment variables.

#### Run the server:
```bash
node server
```

The server will listen on port 8090.

