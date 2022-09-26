#!/bin/bash

source .env
export PGPASSWORD=$DB_PASSWORD

if psql -h $DB_HOST -U $DB_USER -p $DB_PORT -lqt | cut -d \| -f 1 | grep -qw $DB_NAME  ; then
    echo "Database $DB_NAME already exists. Skipping creation step"
else
    echo "Creating database $DB_NAME and schema $DB_NAME"
    psql -h $DB_HOST -U $DB_USER -p $DB_PORT -c "create database $DB_NAME;"
    echo "\\c $DB_NAME \\\\ CREATE SCHEMA $DB_NAME;" | psql -h $DB_HOST -U $DB_USER -p $DB_PORT
    echo "Database created"
fi