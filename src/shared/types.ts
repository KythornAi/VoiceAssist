export type SessionState = 'idle' | 'recording' | 'processing' | 'cancelled'

export type FormatMode = 'note' | 'email' | 'chat' | 'terminal'

export interface AudioChunk {
  sessionId: string
  seq: number
  buffer: ArrayBuffer
}

export type PolishSettings = {
  locale: 'uk' | 'us'
  fixSpelling: boolean
  fixGrammar: boolean
  removeFillerWords: boolean
  pasteAtCursor: boolean
}

export interface AppSettings {
  dictationHotkey: string
  autoPunctuation: boolean
  microphone: string
  language: string
  theme: 'dark' | 'light'
  launchAtStartup: boolean
  maxHistoryItems: number
}

export type SttProvider = 'local' | 'openai'

export type SttSettings = {
  provider: SttProvider
  model: string
}

export interface HistoryItem {
  id: string
  text: string
  timestamp: string
}
