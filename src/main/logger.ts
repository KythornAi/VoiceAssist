import log from 'electron-log'

log.transports.file.level = 'info'
log.transports.console.level = 'debug'

export function createLogger(namespace: string) {
  return log.scope(namespace)
}

export default log
