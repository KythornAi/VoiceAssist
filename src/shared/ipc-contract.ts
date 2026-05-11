import type { SessionState, PolishSettings, SttSettings, FormatMode, HistoryItem, TtsState } from './types'

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
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  VOCAB_GET: 'vocab:get',
  VOCAB_SET: 'vocab:set',
  VOCAB_DELETE: 'vocab:delete',
  HISTORY_GET: 'history:get',
  HISTORY_CLEAR: 'history:clear',
  HOTKEY_TOGGLE: 'hotkey:toggle',
  SESSION_ERROR: 'session:error',
  STT_SETTINGS_GET: 'stt-settings:get',
  STT_SETTINGS_SET: 'stt-settings:set',
  SECRET_SET_OPENAI_KEY: 'secret:setOpenAIKey',
  SECRET_HAS_OPENAI_KEY: 'secret:hasOpenAIKey',
  SECRET_CLEAR_OPENAI_KEY: 'secret:clearOpenAIKey',
  TTS_SPEAK: 'tts:speak',
  TTS_STOP: 'tts:stop',
  TTS_STATE: 'tts:state',
  TTS_READ: 'tts:read',
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

export interface SessionErrorPayload {
  message: string
}

export interface AudioChunkPayload {
  sessionId: string
  seq: number
  buffer: ArrayBuffer
}

export interface WindowApi {
  ping: () => Promise<AppPingResult>
  startSession: (formatMode: FormatMode) => Promise<SessionStartResult>
  stopSession: (sessionId: string) => Promise<SessionStopResult>
  cancelSession: (sessionId: string) => Promise<void>
  sendAudioChunk: (payload: AudioChunkPayload) => void
  onSessionState: (cb: (state: SessionState) => void) => () => void
  onTranscript: (cb: (result: TranscriptResult) => void) => () => void
  openSettings: () => Promise<void>
  openHistory: () => Promise<void>
  getSettings: () => Promise<PolishSettings>
  setSettings: (patch: Partial<PolishSettings>) => Promise<void>
  getVocab: () => Promise<Record<string, string>>
  setVocabEntry: (key: string, value: string) => Promise<void>
  deleteVocabEntry: (key: string) => Promise<void>
  getHistory: () => Promise<HistoryItem[]>
  clearHistory: () => Promise<void>
  onHotkeyToggle: (cb: () => void) => () => void
  onSessionError: (cb: (payload: SessionErrorPayload) => void) => () => void
  getSttSettings: () => Promise<SttSettings>
  setSttSettings: (patch: Partial<SttSettings>) => Promise<void>
  setOpenAIKey: (key: string) => Promise<void>
  hasOpenAIKey: () => Promise<boolean>
  clearOpenAIKey: () => Promise<void>
  speakText: (text: string) => Promise<void>
  stopSpeech: () => Promise<void>
  onTtsState: (cb: (state: TtsState) => void) => () => void
  ttsRead: () => Promise<void>
}
