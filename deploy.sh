docker build --rm=false -t redirectpro/worker:${CIRCLE_TAG:1:10} .
docker push redirectpro/worker:${CIRCLE_TAG:1:10}
