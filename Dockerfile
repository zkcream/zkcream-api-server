ARG NODE_VERSION=16.8.0

FROM node:${NODE_VERSION}-alpine
WORKDIR /zkcream-app

ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

copy package.json yarn.lock zkcream

RUN yarn install --quiet && \
    yarn cache clean --force