const config = {
  'redisHost': process.env.REDIS_HOST || '127.0.0.1',
  'redisPort': process.env.REDIS_PORT || '6379',
  'awsRegion': 'us-east-1'
}

export default config
