import type { FormatMode } from '../../shared/types'

// Matches "Hi [Name]" or "Hi, [Name]" — comma after salutation is optional (whisper often omits it).
// Captures the salutation + name as one group; trailing comma consumed but not captured.
// Limited to 1 word for the name to avoid greedily eating body text.
const GREETING_RE = /^((?:Hi|Hello|Dear|Hey)\s*,?\s+\w+),?\s+/i
const SIGNOFF_RE = /\s+((?:Thanks|Regards|Kind regards|Best regards|Best wishes|Best|Cheers|Yours sincerely|Warm regards|Many thanks|With thanks|Sincerely),?\s*\w*\.?)\s*$/i

export function applyFormat(text: string, mode: FormatMode): string {
  switch (mode) {
    case 'note':
      return text
    case 'email':
      return formatEmail(text)
    case 'chat':
      return stripTrailingFullStop(text)
    case 'terminal':
      return text.toLowerCase().replace(/[.,!?;:'"()\[\]{}]/g, '').replace(/\s+/g, ' ').trim()
  }
}

function formatEmail(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return trimmed

  let body = trimmed
  let greeting = ''
  let signoff = ''

  const greetingMatch = trimmed.match(GREETING_RE)
  if (greetingMatch) {
    greeting = normaliseGreeting(greetingMatch[1])
    body = trimmed.slice(greetingMatch[0].length)
  }

  const signoffMatch = body.match(SIGNOFF_RE)
  if (signoffMatch) {
    signoff = normaliseSignoff(signoffMatch[1].trim())
    body = body.slice(0, body.length - signoffMatch[0].length)
  }

  body = capitalise(body.trim())
  if (body) body = ensureFullStop(body)

  return [greeting, body, signoff].filter(Boolean).join('\n\n')
}

// Normalise to "Hi, Name," regardless of how whisper punctuated the salutation.
function normaliseGreeting(raw: string): string {
  const m = raw.match(/^(Hi|Hello|Hey)\s*,?\s+(\w+)$/i)
  if (m) return `${capitalise(m[1])}, ${capitalise(m[2])},`
  // Dear/other formal salutations — just ensure trailing comma
  return raw.replace(/,\s*$/, '') + ','
}

// Normalise signoff capitalisation.
function normaliseSignoff(raw: string): string {
  return capitalise(raw)
}

function capitalise(text: string): string {
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
