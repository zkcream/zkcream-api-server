#!/bin/bash
GREEN='\033[0;32m'
NC='\033[0m'

set -ex

if [ -z $NODE_ENV ];then
    CHAIN="ganache"
    COMPOSE_FILE="docker-compose-test"
else 
    # for production
    CHAIN="geth"
    COMPOSE_FILE="docker-compose"
fi

cd $(dirname $0)
cd ../

docker build -f ./docker/${CHAIN}/${CHAIN}.dockerfile -t zk-${CHAIN} --target zk-${CHAIN} .
docker run --name zk-${CHAIN} -p 0.0.0.0:8545:8545 zk-${CHAIN}&

echo -e "${GREEN}\nBuilding zkcream-api\n${NC}"
docker build -f Dockerfile -t zkcream-api --target zkcream-api .

echo -e "${GREEN}\nBuilding ${CHAIN}-deployed${NC}\n"
CONTAINER_ID=$(docker ps -a -q --filter ancestor=zk-${CHAIN} --format="{{.ID}}")
docker commit $CONTAINER_ID ${CHAIN}-deployed

echo -e "${GREEN}\nStop zk-ganache container\n${NC}"
docker stop $CONTAINER_ID

echo -e "${GREEN}\nBuilding images using docker-compose with chain: ${CHAIN}\n${NC}"

docker-compose -f docker/${COMPOSE_FILE}.yml build