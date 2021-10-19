#!/bin/sh

echo 'Create application db owner'

mongo ${ZK_MONGO_DB} \
        --host localhost \
        --port ${MONGO_PORT} \
        -u ${MONGO_ROOT_USER} \
        -p ${MONGO_ROOT_PASS} \
        --authenticationDatabase admin \
        --eval "db.createUser({user: '${ZK_MONGO_USER}', pwd: '${ZK_MONGO_PASS}', roles:[{role:'dbOwner', db: '${ZK_MONGO_DB}'}]});"
