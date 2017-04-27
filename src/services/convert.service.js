import Promise from 'es6-promise'
import XLSX from 'xlsx'

export default class ConvertService {

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
}
