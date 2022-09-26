FROM node:14-buster
WORKDIR /workdir

# Install psql
RUN apt-get update && apt-get install postgresql -y -q
