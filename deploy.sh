export TAG=${CIRCLE_TAG:1:10}
export IMAGE=$DOCKER_REPOSITORY:$TAG

# PREPARE AND SEND TO EC2CONTAINER REPOSITORY
eval $(aws ecr get-login --region $AWS_REGION)
docker build --rm=false -t $IMAGE .
docker tag $IMAGE $DOCKER_HOST/$IMAGE
docker push $DOCKER_HOST/$IMAGE

# UPDATE TASK REVISION
aws ecs list-task-definitions --family-prefix $ECS_TASK
export LIST=$(aws ecs list-task-definitions --family-prefix $ECS_TASK)
export DEFINITION=$(node -e "console.log($LIST.taskDefinitionArns.reverse()[0])")
export DESCRIBE=$(aws ecs describe-task-definition --task-definition $DEFINITION)
export UPD_CONTAINER=$(node -e "var c=$DESCRIBE.taskDefinition.containerDefinitions; c[0].image = '$IMAGE'; console.log(JSON.stringify(c))")
export NEW_DESCRIBE=$(aws ecs register-task-definition --family $ECS_TASK --container-definitions $UPD_CONTAINER)
#export NEW_REVISION=$(node -e "console.log($NEW_DESCRIBE.taskDefinition.revision)")
export NEW_LIST=$(aws ecs list-task-definitions --family-prefix $ECS_TASK)
export NEW_DEFINITION=$(node -e "console.log($LIST.taskDefinitionArns.reverse()[0])")

# UPDATE SERVICE
aws ecs update-service --cluster $ECS_CLUSTER --service $ECS_SERVICE --task-definition $NEW_DEFINITION
