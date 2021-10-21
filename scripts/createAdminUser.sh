#!/bin/bash

cd $(dirname $0)
cd ..

source ./docker/.env

# start MongoDB
docker-compose -f docker/docker-compose.yml up -d db
sleep 10s

# start zkcream-api-server
node ./build/ts/index.js &
sleep 30s

curl -X POST -d 'username='${ADMIN_USER} -d 'password='${ADMIN_PASS} -d 'role=1' http://localhost:3000/user/register
sleep 1s

docker-compose -f docker/docker-compose.yml down
kill -9 $(ps aux | grep '[n]ode ./build/ts/index.js' | awk '{print $2}')
