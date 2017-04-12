FROM node:7.6.0
MAINTAINER Udlei Nati <udlei@protonmail.ch>

ADD . /app/
WORKDIR /app/

ENTRYPOINT ["/app/docker-entrypoint.sh"]
