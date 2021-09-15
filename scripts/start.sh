#!/bin/bash

set -eu

cd $(dirname $0)
cd ..

docker-compose -f docker/docker-compose.yml up
