import { describe, it, expect } from 'vitest'
import { POLISH_DEFAULTS } from '../src/main/store/settings-store'
import { TextPolisher } from '../src/main/text-polish/text-polish'
import { TranscriptPipeline } from '../src/main/text-polish/pipeline'

const emptyDicts = { misspellings: {}, usToUk: {}, ukToUs: {} }

describe('POLISH_DEFAULTS', () => {
  it('defaults to UK locale', () => {
    expect(POLISH_DEFAULTS.locale).toBe('uk')
  })

  it('enables all polish toggles by default', () => {
    expect(POLISH_DEFAULTS.fixSpelling).toBe(true)
    expect(POLISH_DEFAULTS.fixGrammar).toBe(true)
    expect(POLISH_DEFAULTS.removeFillerWords).toBe(true)
  })
})

describe('TranscriptPipeline with dynamic options getter', () => {
  it('uses options from getter on each process call', () => {
    let removeFillerWords = true
    const pipeline = new TranscriptPipeline(
      new TextPolisher(emptyDicts),
      () => ({}),
      () => ({ removeFillerWords }),
    )

    const withoutFillers = pipeline.process(['um hello world'])
    expect(withoutFillers).not.toContain('um')

    removeFillerWords = false
    const withFillers = pipeline.process(['um hello world'])
    expect(withFillers).toMatch(/\bum\b/i)
  })

  it('applies locale from getter', () => {
    const usToUk = { color: 'colour' }
    const ukToUs = { colour: 'color' }
    const dicts = { misspellings: {}, usToUk, ukToUs }
    let locale: 'uk' | 'us' = 'uk'
    const pipeline = new TranscriptPipeline(
      new TextPolisher(dicts),
      () => ({}),
      () => ({ locale, fixGrammar: false, removeFillerWords: false, fixSpelling: false }),
    )

    const uk = pipeline.process(['I like the color blue'])
    expect(uk).toContain('colour')

    locale = 'us'
    const us = pipeline.process(['I like the colour blue'])
    expect(us).toContain('color')
  })

  it('works with no options getter (uses TextPolisher defaults)', () => {
    const pipeline = new TranscriptPipeline(new TextPolisher(emptyDicts), () => ({}))
    expect(pipeline.process(['hello world'])).toMatch(/^Hello/)
  })
})
