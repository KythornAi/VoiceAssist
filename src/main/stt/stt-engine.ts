import { WhisperWorker } from './whisper-worker'
import { writeTempWav, deleteTempFile } from './audio-utils'
import log from '../logger'

const logger = log.scope('stt-engine')

export interface SttEngine {
  start(): Promise<void>
  transcribe(chunks: Float32Array[]): Promise<string>
  stop(): void
}

export class WhisperSttEngine implements SttEngine {
  private readonly worker = new WhisperWorker()

  async start(): Promise<void> {
    await this.worker.start()
  }

  async transcribe(chunks: Float32Array[]): Promise<string> {
    const wavPath = writeTempWav(chunks)
    try {
      const text = await this.worker.transcribe(wavPath)
      logger.info('Transcription complete', { chars: text.length })
      return text
    } finally {
      deleteTempFile(wavPath)
    }
  }

  stop(): void {
    this.worker.stop()
  }
}
