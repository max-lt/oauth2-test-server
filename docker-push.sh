#!/usr/bin/env bash

IMAGE_NAME=oauth2-test-server
VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')

read -p "Push version \"$VERSION\" on \"$DOCKER_REGISTRY\"? [Yn] " yn
case $yn in
    [Nn]* ) exit 1;;
    * ) ;;
esac

docker tag ${IMAGE_NAME}:latest ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
docker tag ${IMAGE_NAME}:latest ${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}

docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:latest
docker push ${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}
