import { JsonStore } from './json-store'
import type { PolishSettings, SttSettings, TtsSettings } from '../../shared/types'

export const POLISH_DEFAULTS: PolishSettings = {
  locale: 'uk',
  fixSpelling: true,
  fixGrammar: true,
  removeFillerWords: true,
  pasteAtCursor: true,
  formatMode: 'note',
  voiceFile: '',
  audioDeviceId: '',
}

export const STT_DEFAULTS: SttSettings = {
  provider: 'local',
  model: 'gpt-4o-mini-transcribe',
}

export function createSettingsStore(): JsonStore<PolishSettings> {
  return new JsonStore<PolishSettings>('settings.json', POLISH_DEFAULTS)
}

export function createSttSettingsStore(): JsonStore<SttSettings> {
  return new JsonStore<SttSettings>('stt-settings.json', STT_DEFAULTS)
}

export const TTS_DEFAULTS: TtsSettings = {
  provider: 'local',
  model: 'tts-1',
  voice: 'alloy',
}

export function createTtsSettingsStore(): JsonStore<TtsSettings> {
  return new JsonStore<TtsSettings>('tts-settings.json', TTS_DEFAULTS)
}
