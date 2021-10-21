#!/bin/bash

if [ $# -ne 3 ]; then
    echo "Must be 3 arguments"
    exit 1
fi

ADM_API_USER=$1
ADM_API_PASS=$2
NEW_API_USER=$3
NEW_API_USER_PASS=$(more /dev/urandom  | tr -d -c '[:alnum:]' | fold -w 20 | head -1)

source ./docker/.env

# start MongoDB
docker-compose -f docker/docker-compose.yml up -d db
sleep 10s

# start zkcream-api-server
docker-compose -f docker/docker-compose.yml up -d zkcream-api
sleep 30s

# login
TOKEN="$(curl -s -X POST curl -X POST -d "username=${ADM_API_USER}" -d "password=${ADM_API_PASS}" http://localhost:3000/user/login/ | sed -n -e 's/^.*token":"//p' | cut -d'"' -f1 1>&2)"

# create new API user
RESULT="$(curl -s -w "%{http_code}" -o /dev/null -H "Content-Type: application/json" -H "Authorization: Bearer ${TOKEN}" -X POST -d '{"username": "'$NEW_API_USER'", "password": "'$NEW_API_USER_PASS'"}' http://localhost:3000/user/register)"

# show results
if [ $RESULT == 200 ]; then
    echo "New user created successfully!"
    echo "useraname: $NEW_API_USER, password: $NEW_API_USER_PASS"
elif [ $RESULT == 401 ]; then
    echo "User already exists..."
else
    echo "Failed..."
    exit 1
fi

# stop containers
docker-compose -f docker/docker-compose.yml down

exit 0
