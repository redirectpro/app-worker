docker build --rm=false -t redirectpro/worker:${CIRCLE_SHA1:1:10} .
docker push redirectpro/worker:${CIRCLE_SHA1:1:10}
