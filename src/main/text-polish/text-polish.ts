import fs from 'fs'
import path from 'path'
import { app } from 'electron'

interface Dictionaries {
  readonly misspellings: Readonly<Record<string, string>>
  readonly usToUk: Readonly<Record<string, string>>
  readonly ukToUs: Readonly<Record<string, string>>
}

export interface PolishOptions {
  locale?: 'uk' | 'us'
  fixSpelling?: boolean
  fixGrammar?: boolean
  removeFillerWords?: boolean
}

function matchCase(original: string, replacement: string): string {
  if (original === original.toUpperCase()) return replacement.toUpperCase()
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1)
  }
  return replacement.toLowerCase()
}

export class TextPolisher {
  constructor(private readonly dicts: Dictionaries) {}

  polish(text: string, options: PolishOptions = {}): string {
    const {
      locale = 'uk',
      fixSpelling = true,
      fixGrammar = true,
      removeFillerWords = true,
    } = options

    if (!text || !text.trim()) return ''

    let result = text.trim()

    // 1. Repetition filter (before other processing -- catches whisper hallucinations)
    result = this.filterRepetition(result)

    // 2. Filler word removal
    if (removeFillerWords) result = this.removeFillers(result)

    // 3. Spelling correction
    if (fixSpelling) result = this.fixMisspellings(result)

    // 4. Locale enforcement (after misspelling fix so we work from correct base words)
    if (locale === 'uk' || locale === 'us') result = this.enforceLocale(result, locale)

    // 5. Grammar tidy (last, so capitalisation applies to final text)
    if (fixGrammar) result = this.tidyGrammar(result)

    return result
  }

  private filterRepetition(text: string): string {
    if (text.length <= 20) return text
    const words = text.split(/\s+/)
    if (words.length <= 8) return text

    const lastWord = words[words.length - 1].toLowerCase().replace(/[.,!?;:]+$/, '')
    let repeats = 0
    for (let i = words.length - 1; i >= 0; i--) {
      const current = words[i].toLowerCase().replace(/[.,!?;:]+$/, '')
      if (current === lastWord) repeats++
      else break
    }

    if (repeats > 4) {
      return words.slice(0, words.length - repeats + 1).join(' ') + '...'
    }
    return text
  }

  private removeFillers(text: string): string {
    const fillers = /\b(um|uh|ah|er|hm|hmm|like|you know|sort of|kind of)\b([,.]*\s*)/gi
    let result = text.replace(fillers, '')
    result = result.replace(/\s+/g, ' ')
    result = result.replace(/ ,/g, ',')
    result = result.replace(/^[,.\s]+/, '')
    result = result.replace(/([.?!])\s*[,.]+/g, '$1')
    return result.trim()
  }

  private fixMisspellings(text: string): string {
    return text.replace(/\b[\w']+\b/g, (word) => {
      const correction = this.dicts.misspellings[word.toLowerCase()]
      return correction ? matchCase(word, correction) : word
    })
  }

  private enforceLocale(text: string, locale: 'uk' | 'us'): string {
    const map = locale === 'uk' ? this.dicts.usToUk : this.dicts.ukToUs
    if (Object.keys(map).length === 0) return text
    return text.replace(/\b[\w]+\b/g, (word) => {
      const replacement = map[word.toLowerCase()]
      return replacement ? matchCase(word, replacement) : word
    })
  }

  private tidyGrammar(text: string): string {
    let result = text.replace(/\s{2,}/g, ' ')
    result = result.replace(/\s+([.,!?;:])/g, '$1')
    result = result.replace(/([.!?])\s+([a-z])/g, (_, punct: string, letter: string) => punct + ' ' + letter.toUpperCase())
    if (result.length > 0 && /[a-z]/.test(result[0])) {
      result = result[0].toUpperCase() + result.slice(1)
    }
    result = result.replace(/\bi\b/g, 'I')
    result = result.replace(/\bi'([a-z])/g, "I'$1")
    if (result.length > 0 && !/[.!?]$/.test(result.trim())) {
      result = result.trim() + '.'
    }
    return result.trim()
  }
}

interface PairsJson { pairs: Record<string, string> }
interface CorrectionsJson { corrections: Record<string, string> }

export function loadTextPolisher(dictBase: string): TextPolisher {
  const pairsRaw = JSON.parse(
    fs.readFileSync(path.join(dictBase, 'uk-us-pairs.json'), 'utf8'),
  ) as PairsJson
  const misspellRaw = JSON.parse(
    fs.readFileSync(path.join(dictBase, 'common-misspellings.json'), 'utf8'),
  ) as CorrectionsJson

  const usToUk: Record<string, string> = {}
  const ukToUs: Record<string, string> = {}
  for (const [us, uk] of Object.entries(pairsRaw.pairs)) {
    usToUk[us.toLowerCase()] = uk
    ukToUs[(uk as string).toLowerCase()] = us
  }

  const misspellings: Record<string, string> = {}
  for (const [wrong, right] of Object.entries(misspellRaw.corrections)) {
    misspellings[wrong.toLowerCase()] = right as string
  }

  return new TextPolisher({ misspellings, usToUk, ukToUs })
}

export function getDictBasePath(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'dictionaries')
    : path.join(app.getAppPath(), 'src', 'main', 'dictionaries')
}
