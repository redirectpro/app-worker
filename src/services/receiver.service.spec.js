import Promise from 'es6-promise'
import chai from 'chai'
import sinon from 'sinon'
import conn from '../connections'
import ReceiverService from './receiver.service'
import EventEmitter from 'events'

const expect = chai.expect

describe('./services/converter.service', () => {
  const receiverService = new ReceiverService()

  describe('start', () => {
    it('success', (done) => {
      sinon.stub(ReceiverService.prototype, 'createQueue').callsFake(() => {
        class MyEmitter extends EventEmitter {
          process () { return true }
        }
        return new MyEmitter()
      })

      const spyReceiverServiceStartQueue = sinon.spy(receiverService, 'startQueue')
      const spyReceiverServiceStartProcess = sinon.spy(receiverService, 'startProcess')
      receiverService.start()
      expect(spyReceiverServiceStartQueue.called).to.be.equal(true)
      expect(spyReceiverServiceStartProcess.called).to.be.equal(true)
      ReceiverService.prototype.createQueue.restore()
      receiverService.startQueue.restore()
      receiverService.startProcess.restore()
      done()
    })
  })

  describe('startQueue', () => {
    it('success', (done) => {
      sinon.stub(ReceiverService.prototype, 'createQueue').callsFake(() => {
        class MyEmitter extends EventEmitter {
          process () { return true }
        }
        return new MyEmitter()
      })

      receiverService.startQueue()
      ReceiverService.prototype.createQueue.restore()
      done()
    })
  })

  describe('startProcess', () => {
    it('success', (done) => {
      sinon.stub(conn.dyndb, 'get').callsFake(() => {
        return {
          promise: () => {
            return Promise.resolve({
              Item: {
                targetHost: 'dw.de',
                objectKey: '/a/b/c/file.json'
              }
            })
          }
        }
      })
      sinon.stub(conn.s3, 'getObject').callsFake(() => {
        return {
          promise: () => {
            return Promise.resolve({
              Body: 'content-body'
            })
          }
        }
      })
      sinon.stub(conn.s3, 'putObject').callsFake(() => {
        return {
          promise: () => {
            return Promise.resolve()
          }
        }
      })
      sinon.stub(receiverService.fileReceiver, 'process').callsFake((cb) => {
        let progress = 0

        const job = {
          jobId: 1,
          data: {
            applicationId: 'app-id',
            redirectId: 'redirect-id'
          },
          progress: (value) => {
            progress = value
            return progress
          }
        }

        cb(job, (err, object) => {
          expect(err).to.be.null
          expect(object).to.be.an('object')
          expect(object.queue).to.be.equal('fileReceiver')
          expect(object.objectLink).to.be.an('string')
          expect(progress).to.be.equal(100)
          conn.dyndb.get.restore()
          conn.s3.getObject.restore()
          conn.s3.putObject.restore()
          receiverService.fileReceiver.process.restore()
          done()
        })
      })

      receiverService.startProcess()
    })

    it('should return done(err)', (done) => {
      sinon.stub(conn.dyndb, 'get').callsFake(() => {
        return {
          promise: () => {
            return Promise.resolve({})
          }
        }
      })

      sinon.stub(receiverService.fileReceiver, 'process').callsFake((cb) => {
        let progress = 0

        const job = {
          jobId: 1,
          data: {
            applicationId: 'app-id',
            redirectId: 'redirect-id'
          },
          progress: (value) => {
            progress = value
            return progress
          }
        }

        cb(job, (err) => {
          try {
            expect(err.name).to.be.equal('ObjectNotFound')
            expect(err.message).to.be.equal('Object do not exist.')
            conn.dyndb.get.restore()
            receiverService.fileReceiver.process.restore()
            done()
          } catch (error) {
            done(error)
          }
        })
      })

      receiverService.startProcess()
    })

    it('should return error', (done) => {
      sinon.stub(conn.dyndb, 'get').callsFake(() => {
        return {
          promise: () => {
            return Promise.reject({
              name: 'NAME',
              message: 'message'
            })
          }
        }
      })

      sinon.stub(receiverService.fileReceiver, 'process').callsFake((cb) => {
        let progress = 0

        const job = {
          jobId: 1,
          data: {
            applicationId: 'app-id',
            redirectId: 'redirect-id'
          },
          progress: (value) => {
            progress = value
            return progress
          }
        }

        cb(job, (err) => {
          expect(err.name).to.be.equal('NAME')
          expect(err.message).to.be.equal('message')
          conn.dyndb.get.restore()
          receiverService.fileReceiver.process.restore()
          done()
        })
      })

      receiverService.startProcess()
    })
  })
})
