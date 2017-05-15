import Promise from 'es6-promise'
import XLSX from 'xlsx'
import randtoken from 'rand-token'
import LoggerHandler from '../handlers/logger.handler'
import Queue from 'bull'
import conn from '../connections'
import config from '../config'

export default class ConverterService {

  constructor () {
    this.logger = new LoggerHandler()
    this.fileConverter = null
  }

  start () {
    this.startQueue()
    this.startProcess()
  }

  startQueue () {
    this.fileConverter = this.createQueue()
    this.fileConverter.on('ready', () => {
      this.logger.info('fileConverter is ready')
    }).on('error', (err) => {
      this.logger.error(err)
    }).on('failed', (job, err) => {
      this.logger.error(err.message)
    })
  }

  createQueue () {
    return Queue('fileConverter', config.redisPort, config.redisHost)
  }

  startProcess () {
    this.fileConverter.process((job, done) => {
      const path = `fileConverter jobId: ${job.jobId}`
      this.logger.info(`${path} applicationId: ${job.data.applicationId} redirectId: ${job.data.redirectId}`)
      job.progress(1)

      let promise
      const key = randtoken.generate(16) + '.json'
      const keyFullPath = `${key[0]}/${key[1]}/${key}`
      job.progress(1)

      let objectLength = 0

      this.getContent(job.data)

      promise.then((object) => {
        job.progress(15)
        objectLength = object.length

        const params = { Bucket: config.awsS3Bucket, Key: keyFullPath, Body: JSON.stringify(object) }
        this.logger.debug(`${path}`, params)
        job.progress(20)

        return conn.s3.putObject(params).promise()
      }).then(() => {
        this.logger.info(`${path} result of conn.s3.putObject then`)
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
        this.logger.info(`${path} result of conn.dyndb.get then`)
        job.progress(60)

        let promises = []

        if (data.Item.objectKey) {
          const p1 = conn.s3.deleteObject({
            Bucket: config.awsS3Bucket,
            Key: data.Item.objectKey
          }).promise()
          promises.push(p1)
          this.logger.info(`${path} must delete object ${data.Item.objectKey}`)
        }

        job.progress(75)

        const updGetParams = {
          TableName: `${config.dynamodbPrefix}redirect`,
          Key: {
            applicationId: job.data.applicationId,
            id: job.data.redirectId
          },
          UpdateExpression: 'SET #obj = :obj, #objl = :objl',
          ExpressionAttributeNames: { '#obj': 'objectKey', '#objl': 'objectLength' },
          ExpressionAttributeValues: { ':obj': keyFullPath, ':objl': objectLength }
        }

        const p2 = conn.dyndb.update(updGetParams).promise()
        promises.push(p2)

        job.progress(85)

        return Promise.all(promises)
      }).then(() => {
        this.logger.info(`${path} result of Promise chain then/job done!`)
        job.progress(100)
        done(null, { objectLength: objectLength })
      }).catch((err) => {
        this.logger.error(`${path} result of Promise chain catch`, err.message)
        done(err)
      })
    })
  }

  getContent (data) {
    if (data.fileData) {
      return this.toJson(data.fileData)
    } else {
      return this.analyzeJson(data.jsonData)
    }
  }

  toJson (data) {
    return new Promise((resolve, reject) => {
      const workbook = XLSX.read(Buffer.from(data))
      const sheetNameList = workbook.SheetNames
      let jsonData = []

      sheetNameList.forEach((y) => {
        let worksheet = workbook.Sheets[y]
        let headers = {}
        let index = 0
        let lastRow

        for (let z in worksheet) {
          if (z[0] === '!') continue
          // parse out the column, row, and value
          let tt = 0
          for (let i = 0; i < z.length; i++) {
            if (!isNaN(z[i])) {
              tt = i
              break
            }
          }
          let col = z.substring(0, tt)
          let row = parseInt(z.substring(tt))
          let value = worksheet[z].v

          // store header names
          if (row === 1 && value) {
            headers[col] = value
            continue
          }
          if (!lastRow) lastRow = row
          if (lastRow !== row) {
            index += 1
            lastRow = row
          }
          if (['to', 'from'].includes(headers[col])) {
            if (!jsonData[index]) jsonData[index] = {}
            jsonData[index][headers[col]] = value
          }
        }
      })

      if (jsonData.length === 0) {
        return reject({ message: 'Invalid data or fields.' })
      } else {
        return resolve(jsonData)
      }
    })
  }

  analyzeJson (data) {
    return new Promise((resolve) => {
      return resolve(data)
    })
  }
}
