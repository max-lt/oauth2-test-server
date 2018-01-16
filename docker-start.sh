#!/usr/bin/env bash

PROTOCOL=http
CLIENT_PORT=8080
SERVER_PORT=8090
CLIENT_SERVER=localhost:8080
AUTH_SERVER=localhost:8090
IMAGE=${DOCKER_REGISTRY}/oauth2-test-server:latest

docker run -p ${CLIENT_PORT}:8080 -p ${SERVER_PORT}:8090 \
    --env GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID} \
    --env GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET} \
    --env AUTH_SERVER=${AUTH_SERVER} \
    --env CLIENT_SERVER=${CLIENT_SERVER} \
    --env PROTOCOL=${CLIENT_SERVER} \
    --restart=on-failure \
    --name oauth2-test-server \
    ${IMAGE}
