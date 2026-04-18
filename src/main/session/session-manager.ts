import { EventEmitter } from 'events'
import { randomUUID } from 'crypto'
import type { SessionState } from '@shared/types'

export class SessionManager extends EventEmitter {
  private state: SessionState = 'idle'
  private sessionId: string | null = null
  private chunkCount = 0

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
    const chunks = this.chunkCount
    this.transition('processing')
    // Phase 1: no STT — resolve immediately back to idle
    this.sessionId = null
    this.chunkCount = 0
    this.transition('idle')
    return chunks
  }

  cancel(sessionId: string): void {
    if (this.sessionId !== sessionId) return
    this.sessionId = null
    this.chunkCount = 0
    this.transition('cancelled')
    this.transition('idle')
  }

  receiveChunk(sessionId: string): void {
    if (this.state === 'recording' && this.sessionId === sessionId) {
      this.chunkCount++
    }
  }

  private transition(next: SessionState): void {
    this.state = next
    this.emit('state', next)
  }
}
