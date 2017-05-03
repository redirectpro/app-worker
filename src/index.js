// import LoggerHandler from './handlers/logger.handler'
import ConverterService from './services/converter.service'
import ReceiverService from './services/receiver.service'

const converterService = new ConverterService()
converterService.start()

const receiverService = new ReceiverService()
receiverService.start()
