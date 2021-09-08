ARG NODE_VERSION=16.8.0

FROM node:${NODE_VERSION}-alpine as builder
WORKDIR /api-server

RUN apk update && \
    apk add git

ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

COPY package.json yarn.lock

RUN yarn install --quiet && \
    yarn cache clean --force

RUN mkdir zkcream \
    ts \
    abis && \
    mkdir -p zkcream/packages zkcream/scripts

COPY zkcream/packages /api-server/zkcream/packages/
COPY zkcream/scripts/clean.sh /api-server/zkcream/scripts/
COPY zkcream/*.json /api-server/zkcream/
COPY zkcream/*.lock /api-server/zkcream/
COPY ts ts/
COPY abis abis/

RUN yarn 

###
ENV NODE_ENV_BAK=$NODE_ENV
ENV NODE_ENV=production

RUN cd zkcream && \
    yarn && \
    yarn build