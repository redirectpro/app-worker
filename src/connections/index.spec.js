import chai from 'chai'
import conn from './index'

const expect = chai.expect

describe('./connections/index', () => {
  it('conn.bull should return an object', (done) => {
    expect(conn.s3).to.be.an('object')
    done()
  })
})
