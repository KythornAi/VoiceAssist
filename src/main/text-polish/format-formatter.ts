import type { FormatMode } from '../../shared/types'

export function applyFormat(text: string, mode: FormatMode): string {
  switch (mode) {
    case 'note':
      return text
    case 'email':
      return ensureFullStop(ensureCapitalised(text))
    case 'chat':
      return stripTrailingFullStop(text)
    case 'terminal':
      return text.toLowerCase().replace(/[.,!?;:'"()\[\]{}]/g, '').replace(/\s+/g, ' ').trim()
  }
}

function ensureCapitalised(text: string): string {
  if (!text) return text
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function ensureFullStop(text: string): string {
  if (!text) return text
  return /[.!?]$/.test(text) ? text : `${text}.`
}

function stripTrailingFullStop(text: string): string {
  return text.replace(/\.$/, '')
}
