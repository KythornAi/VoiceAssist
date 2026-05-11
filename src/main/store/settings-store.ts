import { JsonStore } from './json-store'
import type { PolishSettings, SttSettings } from '../../shared/types'

export const POLISH_DEFAULTS: PolishSettings = {
  locale: 'uk',
  fixSpelling: true,
  fixGrammar: true,
  removeFillerWords: true,
  pasteAtCursor: true,
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
