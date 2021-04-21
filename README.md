# zkCREAM api server

[![server test](https://github.com/zkcream/zkcream-api-server/actions/workflows/node.yml/badge.svg)](https://github.com/zkcream/zkcream-api-server/actions/workflows/node.yml)

This is the server that provides the backend API for zkCREAM.

`TODO` provide api documentations.

## Requirements

* Nodejs >= v14.x

## Build

```bash
yarn build
node ./build/index.js
```

Then access `{HOST}:{PORT}` `http://localhost:3000` for a test environment. You can change the hostname and port number customising the [config](https://github.com/zkcream/zkcream-api-server/tree/master/ts/config) file.

## Test

1. In order to run test on local machine, first you need to clone [zkcream repo](https://github.com/couger-inc/cream.git).

```bash
git clone https://github.com/couger-inc/cream.git
```

2. Then, you need to run `ganche` and `ipfs` node and finally migrate the contracts by typing

```bash
cd cream
yarn
yarn build
yarn workspace @cream/contracts ganache
yarn start:ipfs
yarn workspace @cream/contracts migrate
```

3. Lastly, you can run test command as follows:

```bash
yarn test
```
