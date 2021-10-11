#!/bin/bash

set -e

cd $(dirname $0)
cd ..

if [ -z $NODE_ENV ];then
    CHAIN="ganache"
    COMPOSE_FILE="docker-compose-test"
else
    # for production
    CHAIN="geth"
    COMPOSE_FILE="docker-compose"
fi

docker-compose -f docker/${COMPOSE_FILE}.yml up
