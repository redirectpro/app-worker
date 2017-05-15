import Promise from 'es6-promise'
import chai from 'chai'
import sinon from 'sinon'
import chaiJsonSchema from 'chai-json-schema'
import conn from '../connections'
import ConverterService from './converter.service'
import EventEmitter from 'events'
import * as fs from 'fs'

const expect = chai.expect

chai.use(chaiJsonSchema)

describe('./services/converter.service', () => {
  const converterService = new ConverterService()

  describe('start', () => {
    it('success', (done) => {
      sinon.stub(ConverterService.prototype, 'createQueue').callsFake(() => {
        class MyEmitter extends EventEmitter {
          process () { return true }
        }
        return new MyEmitter()
      })

      const spyConverterServiceStartQueue = sinon.spy(converterService, 'startQueue')
      const spyConverterServiceStartProcess = sinon.spy(converterService, 'startProcess')
      converterService.start()
      expect(spyConverterServiceStartQueue.called).to.be.equal(true)
      expect(spyConverterServiceStartProcess.called).to.be.equal(true)
      ConverterService.prototype.createQueue.restore()
      converterService.startQueue.restore()
      converterService.startProcess.restore()
      done()
    })
  })

  describe('startQueue', () => {
    it('success', (done) => {
      sinon.stub(ConverterService.prototype, 'createQueue').callsFake(() => {
        class MyEmitter extends EventEmitter {
          process () { return true }
        }
        return new MyEmitter()
      })

      converterService.startQueue()
      ConverterService.prototype.createQueue.restore()
      done()
    })
  })

  describe('startProcess', () => {
    it('success', (done) => {
      sinon.stub(conn.s3, 'putObject').callsFake(() => {
        return {
          promise: () => {
            return Promise.resolve()
          }
        }
      })
      sinon.stub(conn.s3, 'deleteObject').callsFake(() => {
        return {
          promise: () => {
            return Promise.resolve()
          }
        }
      })
      sinon.stub(conn.dyndb, 'update').callsFake(() => {
        return {
          promise: () => {
            return Promise.resolve()
          }
        }
      })
      sinon.stub(conn.dyndb, 'get').callsFake(() => {
        return {
          promise: () => {
            return Promise.resolve({
              Item: {
                objectKey: '/a/b/c/file.json'
              }
            })
          }
        }
      })
      sinon.stub(converterService.fileConverter, 'process').callsFake((cb) => {
        let progress = 0

        const job = {
          jobId: 1,
          data: {
            applicationId: 'app-id',
            redirectId: 'redirect-id',
            jsonData: [
              { from: 'a', to: 'b' },
              { from: 'c', to: 'd' }
            ]
          },
          progress: (value) => {
            progress = value
            return progress
          }
        }

        cb(job, (err, object) => {
          expect(err).to.be.null
          expect(object).to.be.an('object')
          expect(object.objectLength).to.be.equal(2)
          conn.s3.putObject.restore()
          conn.s3.deleteObject.restore()
          conn.dyndb.update.restore()
          conn.dyndb.get.restore()
          converterService.fileConverter.process.restore()
          done()
        })
      })

      converterService.startProcess()
    })

    it('error', (done) => {
      sinon.stub(converterService, 'getContent').rejects({
        name: 'NAME',
        message: 'message'
      })
      sinon.stub(converterService.fileConverter, 'process').callsFake((cb) => {
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
          converterService.getContent.restore()
          converterService.fileConverter.process.restore()
          done()
        })
      })

      converterService.startProcess()
    })
  })

  describe('getContent', () => {
    it('success', (done) => {
      sinon.stub(converterService, 'toJson').resolves()
      sinon.stub(converterService, 'analyzeJson').resolves()

      const p1 = converterService.getContent({ fileData: 'content' })
      const p2 = converterService.getContent({ jsonData: { content: 'OK' } })
      Promise.all([p1, p2]).then(() => {
        converterService.toJson.restore()
        converterService.analyzeJson.restore()
        done()
      }).catch(err => done(err))
    })
  })

  describe('toJson', () => {
    it('success', (done) => {
      const jsonSchema = {
        type: 'array',
        items: {
          type: 'object',
          required: ['from', 'to'],
          properties: {
            from: { type: 'string' },
            to: { type: 'string' }
          }
        }
      }

      const data = fs.readFileSync('./test/test.xlsx')

      converterService.toJson(data).then((json) => {
        expect(json).to.be.an('array')
        expect(json[0]).to.be.an('object')
        expect(json).to.be.jsonSchema(jsonSchema)
        done()
      }).catch(err => done(err))
    })

    it('error', (done) => {
      converterService.toJson('').catch((err) => {
        expect(err.message).to.be.equal('Invalid data or fields.')
        done()
      }).catch(err => done(err))
    })
  })

  describe('analyzeJson', () => {
    it('success', (done) => {
      converterService.analyzeJson({ content: 'OK' }).then((data) => {
        expect(data.content).to.be.equal('OK')
        done()
      })
    })
  })
})
