#!/bin/bash

cd $(dirname $0)
cd ..

source ./docker/.env

# start MongoDB
docker-compose -f docker/docker-compose.yml up -d db
sleep 10s

# start zkcream-api-server
docker-compose -f docker/docker-compose.yml up -d zkcream-api
sleep 30s

curl -X POST -d 'username='${ADMIN_USER} -d 'password='${ADMIN_PASS} -d 'role=1' http://localhost:3000/user/register
sleep 1s

docker-compose -f docker/docker-compose.yml down
