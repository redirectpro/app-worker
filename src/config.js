const config = {
  'redisHost': process.env.REDIS_HOST || '127.0.0.1',
  'redisPort': process.env.REDIS_PORT || '6379',
  'awsRegion': process.env.AWS_REGION || 'eu-central-1',
  'awsS3Bucket': process.env.AWS_S3_BUCKET || 'redirectpro-development',
  'awsS3PublicBucket': process.env.AWS_S3_PUBLIC_BUCKET || 'files-development.redirectpro.io',
  'dynamodbPrefix': process.env.DYNAMODB_PREFIX || 'rp_dev_',
  'loggerLevel': process.env.LOGGER_LEVEL || 'verbose'
}

export default config
