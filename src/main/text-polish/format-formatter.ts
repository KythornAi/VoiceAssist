import type { FormatMode } from '../../shared/types'

const GREETING_RE = /^((?:Hi|Hello|Dear|Hey)\b[^.!?]*?,)\s+/i
const SIGNOFF_RE = /\s+((?:Thanks|Regards|Kind regards|Best regards|Best wishes|Best|Cheers|Yours sincerely|Warm regards|Many thanks|With thanks|Sincerely),?\s*\w*\.?)$/i

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
    greeting = greetingMatch[1]
    body = trimmed.slice(greetingMatch[0].length)
  }

  const signoffMatch = body.match(SIGNOFF_RE)
  if (signoffMatch) {
    signoff = signoffMatch[1].trim()
    body = body.slice(0, body.length - signoffMatch[0].length)
  }

  body = ensureCapitalised(body.trim())
  if (body) body = ensureFullStop(body)

  return [greeting, body, signoff].filter(Boolean).join('\n\n')
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
