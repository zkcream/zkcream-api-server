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

Then access `{HOST}:{PORT}` `http://localhost:3000` for a test environment. You can change the hostname and port number customising the [./ts/config/](config) file.

## Test

```bash
yarn test
```
