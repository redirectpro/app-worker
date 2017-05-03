import LoggerHandler from '../handlers/logger.handler'
import conn from '../connections'
import config from '../config'

export default class ReceiverService {

  constructor () {
    this.logger = LoggerHandler
    this.fileReceiver = conn.bull.fileReceiver
  }

  start () {
    this.startQueue()
    this.startProcess()
  }

  startQueue () {
    this.fileReceiver.on('ready', () => {
      this.logger.info('fileReceiver is ready')
    }).on('error', (err) => {
      this.logger.error(err)
    }).on('failed', (job, err) => {
      this.logger.error(err.message)
    })
  }

  startProcess () {
    this.fileReceiver.process((job, done) => {
      const path = `fileReceiver jobId: ${job.jobId}`
      this.logger.info(`${path} applicationId: ${job.data.applicationId} redirectId: ${job.data.redirectId}`)
      job.progress(10)

      let objectKey
      let targetHost

      const getParams = {
        TableName: `${config.dynamodbPrefix}redirect`,
        Key: {
          applicationId: job.data.applicationId,
          id: job.data.redirectId
        }
      }

      conn.dyndb.get(getParams).promise().then((data) => {
        this.logger.info(`${path} result of conn.dyndb.get then`)
        job.progress(30)
        if (!Object.keys(data).length) return done(null, { objectKey: null })

        targetHost = data.Item.targetHost

        const getS3Params = {
          Bucket: config.awsS3Bucket,
          Key: data.Item.objectKey
        }

        return conn.s3.getObject(getS3Params).promise()
      }).then((data) => {
        this.logger.info(`${path} result of conn.s3.getObject then`)
        job.progress(60)

        objectKey = `${targetHost.replace(/\./g, '-')}-${new Date().getTime()}` + '.json'

        const putS3Params = {
          Bucket: config.awsS3PublicBucket,
          Key: objectKey,
          Body: data.Body,
          ACL: 'public-read'
        }

        return conn.s3.putObject(putS3Params).promise()
      }).then((data) => {
        this.logger.info(`${path} result of conn.s3.putObject then`)
        job.progress(100)
        done(null, {
          ObjectLink: `https://${config.awsS3PublicBucket}/${objectKey}`
        })
      }).catch((err) => {
        this.logger.error(`${path} result of Promise chain catch`, err.message)
        done(err)
      })
    })
  }
}
