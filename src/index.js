import Promise from 'es6-promise'
import config from './config'
import conn from './connections'
import randtoken from 'rand-token'
import LoggerHandler from './handlers/logger.handler'
import ConvertService from './services/convert.service'
const logger = LoggerHandler

const convertService = new ConvertService()

conn.bull.fileConverter.on('ready', () => {
  logger.info('fileConverter is ready')
}).on('error', (err) => {
  logger.error(err)
}).on('failed', (job, err) => {
  logger.error(err.message)
})

conn.bull.fileConverter.process((job, done) => {
  const path = `process jobId: ${job.jobId}`
  logger.info(`${path} applicationId: ${job.data.applicationId} redirectId: ${job.data.redirectId}`)
  job.progress(0)

  const key = randtoken.generate(16) + '.json'
  const keyFullPath = `${key[0]}/${key[1]}/${key}`
  job.progress(1)

  convertService.toJson(job.data.fileData).then((object) => {
    job.progress(15)

    const params = { Bucket: config.awsS3Bucket, Key: keyFullPath, Body: JSON.stringify(object) }
    console.log(2)
    logger.debug(`${path}`, params)
    job.progress(20)

    return conn.s3.putObject(params).promise()
  }).then((data) => {
    logger.info(`${path} result of conn.s3.putObject then`)
    job.progress(50)

    const getParams = {
      TableName: `${config.dynamodbPrefix}redirect`,
      Key: {
        applicationId: job.data.applicationId,
        id: job.data.redirectId
      }
    }

    return conn.dyndb.get(getParams).promise()
  }).then((data) => {
    logger.info(`${path} result of conn.dyndb.get then`)
    job.progress(60)

    let promises = []

    if (data.Item.objectKey) {
      const p1 = conn.s3.deleteObject({
        Bucket: config.awsS3Bucket,
        Key: data.Item.objectKey
      }).promise()
      promises.push(p1)
      logger.info(`${path} must delete object ${data.Item.objectKey}`)
    }

    job.progress(75)

    const updGetParams = {
      TableName: `${config.dynamodbPrefix}redirect`,
      Key: {
        applicationId: job.data.applicationId,
        id: job.data.redirectId
      },
      UpdateExpression: 'SET #obj = :obj',
      ExpressionAttributeNames: { '#obj': 'objectKey' },
      ExpressionAttributeValues: { ':obj': keyFullPath }
    }

    const p2 = conn.dyndb.update(updGetParams).promise()
    promises.push(p2)

    job.progress(85)

    return Promise.all(promises)
  }).then(() => {
    logger.info(`${path} result of Promise chain then/job done!`)
    job.progress(100)
    done()
  }).catch((err) => {
    logger.error(`${path} result of Promise chain catch`, err.message)
    done(err)
  })
})
