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


2. Envrionment setup
* Put secret key for JWT based authentication in `auth.jwt.secretOrKey` within `config/docker.yaml`
* Create `./docker/.env`
  ```
  cat docker/.env.sample > ./docker/.env
  ```

* Set environment variables necessary for db
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
* Put the same value of above `ZK_MONGO_USER` and `ZK_MONGO_PASS` in `mongo.user` and `mongo.password` within `config/docker.yaml`


3. Build Docker
```bash
./scripts/buildDev.sh

# create admin api user
./scripts/createAdminUserForDocker.sh

# create new API user
./scripts/createUserForDocker.sh {admin username} {admin user password} {new username}

# Successful output
# New user created successfully!
# useraname: ..., password: ...

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

3. Envrionment setup (For production, please do the same with config/prod.yaml instead of config/test.yaml)
* Put secret key for JWT based authentication in `auth.jwt.secretOrKey` within `config/test.yaml`
* Create `./docker/.env`
  ```
  cd ../ # project's top directory
  cat docker/.env.sample > ./docker/.env
  ```

* Set environment variables necessary for db
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
* Put the same value of above `ZK_MONGO_USER` and `ZK_MONGO_PASS` in `mongo.user` and `mongo.password` within `config/test.yaml`

4. Build and run api server

```bash
# Check if you are on ./zkcream-api-server
yarn
yarn build

# create admin api user
./scripts/createAdminUser.sh

# create new API user
./scripts/createUser.sh {admin username} {admin user password} {new username}

# Successful output
# New user created successfully!
# useraname: ..., password: ...

yarn start # running at port 3000
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

2. Then, after running MongoDB, you can run test command as follows:

```bash
cd ../ # project's top directory 
yarn start:db
yarn test
```
