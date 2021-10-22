#!/bin/bash

if [ $# -ne 3 ]; then
    echo "Must be 3 arguments"
    exit 1
fi

ADM_API_USER=$1
ADM_API_PASS=$2
NEW_API_USER=$3
NEW_API_USER_PASS=$(cat /dev/urandom | base64 | fold -w 20 | head -n 1)

source ./docker/.env

# start MongoDB
docker-compose -f docker/docker-compose.yml up -d db
sleep 10s

# start zkcream-api-server
node ./build/ts/index.js &
sleep 30s

TOKEN="$(curl -s -X POST curl -X POST -d "username=${ADM_API_USER}" -d "password=${ADM_API_PASS}" http://localhost:3000/user/login/ | sed -n -e 's/^.*token":"//p' | cut -d'"' -f1 1>&2)"

RESULT="$(curl -s -w "%{http_code}" -o /dev/null -H "Content-Type: application/json" -H "Authorization: Bearer ${TOKEN}" -X POST -d '{"username": "'$NEW_API_USER'", "password": "'$NEW_API_USER_PASS'"}' http://localhost:3000/user/register)"


# show results
if [ $RESULT == 200 ]; then
    echo "New user created successfully!"
    echo "useraname: $NEW_API_USER, password: $NEW_API_USER_PASS"
elif [ $RESULT == 401 ]; then
    echo "User already exists..."
else
    echo "Failed..."
fi

# stop containers and kill process
docker-compose -f docker/docker-compose.yml down
kill -9 $(ps aux | grep '[n]ode ./build/ts/index.js' | awk '{print $2}')

exit 0
