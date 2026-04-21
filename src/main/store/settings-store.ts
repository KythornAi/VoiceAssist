import { JsonStore } from './json-store'
import type { PolishSettings } from '../../shared/types'

export const POLISH_DEFAULTS: PolishSettings = {
  locale: 'uk',
  fixSpelling: true,
  fixGrammar: true,
  removeFillerWords: true,
}

export function createSettingsStore(): JsonStore<PolishSettings> {
  return new JsonStore<PolishSettings>('settings.json', POLISH_DEFAULTS)
}
