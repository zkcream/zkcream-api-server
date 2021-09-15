#!/bin/bash
GREEN='\033[0;32m'
NC='\033[0m'

set -e

cd $(dirname $0)
cd ../
docker build -f ./docker/ganache/ganache.dockerfile -t zk-ganache --target zk-ganache .
docker run --name zk-ganache -p 0.0.0.0:8545:8545 zk-ganache&

echo -e "${GREEN}\nBuilding zkcream-api\n${NC}"
docker build -f Dockerfile -t zkcream-api --target zkcream-api .

echo -e "${GREEN}\nBuilding ganache-deployed${NC}\n"
CONTAINER_ID=$(docker ps -a -q --filter ancestor=zk-ganache --format="{{.ID}}")
docker commit $CONTAINER_ID ganache-deployed

echo -e "${GREEN}\nStop zk-ganache container\n${NC}"
docker stop $CONTAINER_ID

echo -e "${GREEN}\nBuilding images using docker-compose${NC}\n"
docker-compose -f docker/docker-compose.yml build