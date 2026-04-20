import type { SessionState } from './types'

export const IPC = {
  APP_PING: 'app:ping',
  SESSION_START: 'session:start',
  SESSION_STOP: 'session:stop',
  SESSION_CANCEL: 'session:cancel',
  SESSION_STATE: 'session:state',
  SESSION_TRANSCRIPT: 'session:transcript',
  AUDIO_CHUNK: 'audio:chunk',
  OPEN_SETTINGS: 'open-settings',
  OPEN_HISTORY: 'open-history',
} as const

export interface AppPingResult {
  ok: true
  version: string
}

export interface SessionStartResult {
  sessionId: string
}

export interface SessionStopResult {
  chunks: number
}

export interface TranscriptResult {
  sessionId: string
  text: string
}

export interface AudioChunkPayload {
  sessionId: string
  seq: number
  buffer: ArrayBuffer
}

export interface WindowApi {
  ping: () => Promise<AppPingResult>
  startSession: () => Promise<SessionStartResult>
  stopSession: (sessionId: string) => Promise<SessionStopResult>
  cancelSession: (sessionId: string) => Promise<void>
  sendAudioChunk: (payload: AudioChunkPayload) => void
  onSessionState: (cb: (state: SessionState) => void) => () => void
  onTranscript: (cb: (result: TranscriptResult) => void) => () => void
  openSettings: () => Promise<void>
  openHistory: () => Promise<void>
}
