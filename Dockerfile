FROM node:7.6.0
MAINTAINER Udlei Nati <udlei@protonmail.ch>

COPY . /app/
WORKDIR /app/

ENTRYPOINT ["/app/docker-entrypoint.sh"]
