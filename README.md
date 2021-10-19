# zkCREAM api server

[![server test](https://github.com/zkcream/zkcream-api-server/actions/workflows/node.yml/badge.svg)](https://github.com/zkcream/zkcream-api-server/actions/workflows/node.yml)

This is the server that provides the backend API for zkCREAM.

## Requirements

* Nodejs ^14.x
* yarn

## Build docker

### Requirements

* docker
* docker-compose

1. Submobule update

```bash
git clone https://github.com/zkcream/zkcream-api-server.git && \
cd zkcream-api-server && \
git submodule update --init
```

2. Build Docker

```bash
./scripts/buildDev.sh
./scripts/start.sh
```

Then, you can http request to the endpoint, for example:

```bash
curl http://localhost:3000/foo

# response
// {msg:"foo"}
```

## Build local

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

## Create Admin User
1. Temporarily replace `secretOrKey` within `config/test.yaml` with the key for production
```
auth:
  jwt:
    secretOrKey: ''
```

2. Put the same key in `secretOrKey` within `config/prod.yaml`

3. Prepare `./docker/.env`
```
MONGO_ROOT_USERNAME={root username for mongo db}
MONGO_ROOT_PASSWORD={root password for mongo db}
MONGO_HOST=localhost
MONGO_PORT=27017
ZK_MONGO_DB=zkcream
ZK_MONGO_USER={username for zkcream db owner}
ZK_MONGO_PASS={password for zkcream db owner}
ADMIN_USER={username for API admin user}
ADMIN_PASS={password for API admin user}
```
*Only API admin user can create a new user*

4. Run script (Run app in test environment)
``` bash
$ sh scripts/createAdminUser.sh
```

5. Undo the change in `secretOrKey` within `config/test.yaml`
