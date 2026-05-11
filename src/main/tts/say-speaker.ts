import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import log from '../logger'

const logger = log.scope('say-speaker')

let activeProcess: ChildProcess | null = null

export function isSpeaking(): boolean {
  return activeProcess !== null
}

export function stop(): void {
  if (activeProcess) {
    activeProcess.kill()
    activeProcess = null
    logger.info('Speech stopped')
  }
}

export function speak(text: string): Promise<void> {
  stop()
  return new Promise((resolve) => {
    // spawn avoids shell injection -- text is a direct argument
    activeProcess = spawn('say', [text])
    activeProcess.on('close', () => {
      activeProcess = null
      resolve()
    })
    activeProcess.on('error', (err) => {
      logger.error('say failed', err)
      activeProcess = null
      resolve()
    })
    logger.info('Speaking via say', { chars: text.length })
  })
}
