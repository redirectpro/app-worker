import Queue from 'bull'
import aws from 'aws-sdk'
import config from '../config'
import randtoken from 'rand-token'
import XLSX from 'xlsx'

aws.config.update({ 'region': config.awsRegion })

const s3 = new aws.S3()
const fileQueue = Queue('fileConverter', config.redisPort, config.redisHost)

fileQueue.on('ready', () => {
  console.log('fileQueue is ready')
}).on('error', (err) => {
  console.log(err)
})

fileQueue.process((job, done) => {
  console.log('Received message:', job.data.applicationId, job.data.redirectId, job.data.file)
  const object = Buffer.from(job.data.fileData)
  const key = randtoken.suid(16) + '.xlsx'
  const params = { Bucket: 'testredirectpro', Key: key, Body: object }
  s3.putObject(params).promise().then((data) => {
    console.log(data)
    done()
  }).catch((err) => {
    console.error(err)
    done(err)
  })
})

const convertToJson = (file) => {
    var workbook = XLSX.readFile(file)
    var sheet_name_list = workbook.SheetNames;
    sheet_name_list.forEach(function(y) {
        var worksheet = workbook.Sheets[y];
        var headers = {};
        var data = [];
        for(z in worksheet) {
            if(z[0] === '!') continue;
            //parse out the column, row, and value
            var tt = 0;
            for (var i = 0; i < z.length; i++) {
                if (!isNaN(z[i])) {
                    tt = i;
                    break;
                }
            };
            var col = z.substring(0,tt);
            var row = parseInt(z.substring(tt));
            var value = worksheet[z].v;

            //store header names
            if(row == 1 && value) {
                headers[col] = value;
                continue;
            }
            if(!data[row]) data[row]={};
            data[row][headers[col]] = value;
        }
        data.shift();
        data.shift();
        console.log(data);
    });
}
