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
          if (!jsonData[row]) jsonData[row] = {}
          jsonData[row][headers[col]] = value
        }

        jsonData.shift()
        jsonData.shift()
      })

      return resolve(jsonData)
    })
  }
}
