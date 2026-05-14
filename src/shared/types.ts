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
  formatMode: FormatMode
  voiceFile: string
  audioDeviceId: string
}

export interface VoiceInfo {
  id: string
  file: string
  lang: string
  voice: string
  quality: string
  gender: 'male' | 'female' | 'unknown'
  label: string
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

export type TtsState = 'idle' | 'speaking'

export type TtsProvider = 'local' | 'openai'

export type TtsSettings = {
  provider: TtsProvider
  model: string
  voice: string
}
