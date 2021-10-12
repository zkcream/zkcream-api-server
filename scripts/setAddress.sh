#!/bin/bash

# CreamFactoryNetworks
CFN_FILE="./zkcream/packages/contracts/app/constants/CreamFactoryNetworks.json"

# MACIFactoryNetworks
MFN_FILE="./zkcream/packages/contracts/app/constants/MACIFactoryNetworks.json"

# config/docker.yml
TARGET_FILE="./ts/config/docker.yaml"

set -ex

cd $(dirname $0)
cd ..

# $1=target, $2=address
overwrite() {
    sed -i -e "s/$1:.*/$1: /g" ${TARGET_FILE}
    sed -i -e "s/$1:/$1: '$2'/g" ${TARGET_FILE}
}

if [ -e ${CFN_FILE} ]; then
    CF_ADDRESS=$(cat ${CFN_FILE} | jq -r .[].address)
    MF_ADDRESS=$(cat ${MFN_FILE} | jq -r .[].address)
    overwrite "creamFactory" ${CF_ADDRESS}
    overwrite "maciFactory" ${MF_ADDRESS}
else
    echo "There are deployed files yet. Exiting..."
    exit 1
fi