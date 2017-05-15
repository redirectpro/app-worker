// import Promise from 'es6-promise'
import chai from 'chai'
import sinon from 'sinon'
// import config from '../config'
// import Queue from 'bull'
import ConverterService from './converter.service'
import EventEmitter from 'events'

// const assert = chai.assert
const expect = chai.expect

describe('./services/application-billing.service', () => {
  const converterService = new ConverterService()

  it('start', (done) => {
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
    done()
  })
})
