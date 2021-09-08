#!/bin/bash
GREEN='\033[0;32m'
NC='\033[0m'

set -e

cd $(dirname $0)
cd ../
docker build -f ./docker/ganache/ganache.dockerfile -t zk-ganache --target zk-ganache .

echo -e "${GREEN}\nBuilding builder\n${NC}"
docker build -f Dockerfile -t builder --target builder .
