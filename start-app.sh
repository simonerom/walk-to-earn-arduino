#!/bin/bash

source .env

echo "Installing dependencies"
npm install

echo "Compiling app"
npm run build

export PGPASSWORD=$DB_PASSWORD

if psql -h $DB_HOST -U $DB_USER -p $DB_PORT -lqt | cut -d \| -f 1 | grep -qw $PROJECT  ; then
    echo "Database $PROJECT already exists. Skipping creation step"
else
    ./createDb.sh

    echo "Initializing database after creation step"
    node dist/projects/$PROJECT/initdb.js
    echo "Database initialized"
fi

if [ "$INIT_DB" = true ] ; then
    echo "Initializing database"
    node dist/projects/$PROJECT/initdb.js
    echo "Database initialized"
fi

# Keep the container running so we are able to attach
# touch keeprunning
# tail -f keeprunning

echo "Starting app"
npm run app

