import Promise from 'es6-promise'
import config from './config'
import conn from './connections'
import randtoken from 'rand-token'
import ConvertService from './services/convert.service'

const convertService = new ConvertService()

conn.bull.fileConverter.on('ready', () => {
  console.log('fileQueue is ready')
}).on('error', (err) => {
  console.log(err)
})

conn.bull.fileConverter.process((job, done) => {
  console.log('Received message:', job.data.applicationId, job.data.redirectId, job.data.file)
  const object = convertService.toJson(job.data.fileData)
  const key = randtoken.generate(16) + '.json'
  const keyFullPath = `${key[0]}/${key[1]}/${key}`
  const params = { Bucket: config.awsS3Bucket, Key: keyFullPath, Body: JSON.stringify(object) }
  console.log(params)
  job.progress(0)

  conn.s3.putObject(params).promise().then((data) => {
    console.log('upload s3 done!')
    job.progress(25)

    const getParams = {
      TableName: `${config.dynamodbPrefix}redirect`,
      Key: {
        applicationId: job.data.applicationId,
        id: job.data.redirectId
      }
    }

    conn.dyndb.get(getParams).promise().then((data) => {
      console.log('get done!')
      job.progress(50)

      let promises = []

      if (data.Item.objectKey) {
        const p1 = conn.s3.deleteObject({
          Bucket: config.awsS3Bucket,
          Key: data.Item.objectKey
        }).promise()
        promises.push(p1)
      }

      job.progress(75)

      let updGetParams = getParams
      updGetParams.UpdateExpression = 'SET #obj = :obj'
      updGetParams.ExpressionAttributeNames = { '#obj': 'objectKey' }
      updGetParams.ExpressionAttributeValues = { ':obj': keyFullPath }

      const p2 = conn.dyndb.update(updGetParams).promise()
      promises.push(p2)

      job.progress(85)

      Promise.all(promises).then(() => {
        job.progress(100)
        done()
        console.log('update and delete done!')
      }).catch((err) => {
        console.log(err)
      })

      console.log(data.Item.objectKey)
    }).catch((err) => {
      console.log(err)
    })
  }).catch((err) => {
    console.error(err)
    done(err)
  })
})
