import { addIndex, map, complement, isNil } from 'ramda'
import { IS_DEV } from './constants'

export const mapIndexed = addIndex(map)
export const exist = complement(isNil)

const _log = logType => (...msg) => {
  if (IS_DEV) console[logType](...msg)
}
export const log = _log('log')
log.log = _log('log')
log.error = _log('error')
log.warn = _log('warn')
log.info = _log('info')
