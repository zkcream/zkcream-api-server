# zkCREAM api server

[![server test](https://github.com/zkcream/zkcream-api-server/actions/workflows/node.yml/badge.svg)](https://github.com/zkcream/zkcream-api-server/actions/workflows/node.yml)

This is the server that provides the backend API for zkCREAM.

## Requirements

* Nodejs ^14.x
* yarn

## Build

1. Submodule update

```bash
git clone https://github.com/zkcream/zkcream-api-server.git && \
cd zkcream-api-server && \
git submodule update --init
```

2. Build zkcream

```bash
cd zkcream # inside of submodule
yarn
yarn build
```

3. Build and run api server

```bash
cd ../ # project's top directory 
yarn build
yarn run # running at port 3000
```

Then access `{HOST}:{PORT}` `http://localhost:3000` for a test environment. You can change the hostname and port number customising the [config](https://github.com/zkcream/zkcream-api-server/tree/master/ts/config) file.

## Test

1. You need to run `ganche` and `ipfs` node and finally migrate the contracts by typing

```bash
cd zkcream

# if you haven't built yet, run:
# yarn
# yarn build

yarn workspace @cream/contracts ganache
yarn start:ipfs
yarn workspace @cream/contracts migrate
```

2. Then, you can run test command as follows:

```bash
cd ../ # project's top directory 
yarn test
```
