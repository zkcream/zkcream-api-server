ARG NODE_VERSION=16.8.0

FROM node:${NODE_VERSION}-alpine AS zkcream-api
WORKDIR /api-server

RUN apk update && \
    apk add git \
    curl \
    bash \
    wget

ARG NODE_ENV
ENV NODE_ENV=$NODE_ENV

COPY package.json .
COPY tsconfig.json .
COPY yarn.lock .

RUN yarn install --quiet && \
    yarn cache clean --force

RUN mkdir zkcream \
    ts \
    abis && \
    mkdir -p zkcream/packages zkcream/scripts

COPY zkcream/packages /api-server/zkcream/packages/
COPY zkcream/scripts /api-server/zkcream/scripts/
COPY zkcream/*.json /api-server/zkcream/
COPY zkcream/*.lock /api-server/zkcream/
COPY ts ts/
COPY abis abis/

RUN yarn 

###
ENV NODE_ENV_BAK=$NODE_ENV

### TEMP build
ENV NODE_ENV=test

RUN cd zkcream && \
    yarn clean && \
    yarn && \
    yarn build

RUN cd zkcream/packages/contracts && \
    yarn migrate:docker

RUN echo "Building api-server" && \
    yarn build