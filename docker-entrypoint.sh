#!/bin/bash
set -e

if [ "$1" = '' ]; then
    npm start
fi

exec "$@"
