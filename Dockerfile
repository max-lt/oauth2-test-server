FROM node:9.2-alpine

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Bundle app source
COPY . /usr/src/app

RUN npm install --silent --production

EXPOSE 8080 8090
CMD [ "npm", "start" ]
