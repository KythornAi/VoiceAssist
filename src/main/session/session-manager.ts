import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import type { SessionState } from '../../shared/types'
import type { SttEngine } from '../stt/stt-engine'
import type { TranscriptPipeline } from '../text-polish/pipeline'
import log from '../logger'

const logger = log.scope('session-manager')

export class SessionManager extends EventEmitter {
  private state: SessionState = 'idle'
  private sessionId: string | null = null
  private chunkCount = 0
  private audioChunks: Float32Array[] = []
  private readonly stt: SttEngine | null
  private readonly pipeline: TranscriptPipeline | null

  constructor(stt?: SttEngine, pipeline?: TranscriptPipeline) {
    super()
    this.stt = stt ?? null
    this.pipeline = pipeline ?? null
  }

  getState(): SessionState {
    return this.state
  }

  getSessionId(): string | null {
    return this.sessionId
  }

  getChunkCount(): number {
    return this.chunkCount
  }

  start(): string {
    if (this.state !== 'idle') {
      throw new Error(`Cannot start session: state is ${this.state}`)
    }
    this.sessionId = randomUUID()
    this.chunkCount = 0
    this.audioChunks = []
    this.transition('recording')
    return this.sessionId
  }

  stop(sessionId: string): number {
    if (this.state !== 'recording') {
      throw new Error(`Cannot stop session: state is ${this.state}`)
    }
    if (this.sessionId !== sessionId) {
      throw new Error('Session ID mismatch')
    }
    const chunkCount = this.chunkCount
    const chunks = [...this.audioChunks]
    const sid = sessionId

    this.sessionId = null
    this.chunkCount = 0
    this.audioChunks = []

    this.transition('processing')
    void this.processTranscription(sid, chunks)

    return chunkCount
  }

  cancel(sessionId: string): void {
    if (this.sessionId !== sessionId) return
    this.sessionId = null
    this.chunkCount = 0
    this.audioChunks = []
    this.transition('cancelled')
    this.transition('idle')
  }

  receiveChunk(sessionId: string, buffer: ArrayBuffer): void {
    if (this.state === 'recording' && this.sessionId === sessionId) {
      this.chunkCount++
      this.audioChunks.push(new Float32Array(buffer))
    }
  }

  private async processTranscription(sessionId: string, chunks: Float32Array[]): Promise<void> {
    try {
      if (!this.stt || chunks.length === 0) return
      await this.stt.start()
      const rawText = await this.stt.transcribe(chunks)
      this.stt.stop()
      const text = this.pipeline ? this.pipeline.process([rawText]) : rawText
      this.emit('transcript', { sessionId, text })
    } catch (err) {
      logger.error('Transcription failed', err)
      this.stt?.stop()
    } finally {
      this.transition('idle')
    }
  }

  private transition(next: SessionState): void {
    this.state = next
    this.emit('state', next)
  }
}
