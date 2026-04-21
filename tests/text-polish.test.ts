import { describe, it, expect } from 'vitest'
import { TextPolisher } from '../src/main/text-polish/text-polish'
import { assembleTranscript } from '../src/main/text-polish/transcript-assembler'
import { applyVocabulary } from '../src/main/text-polish/vocabulary-corrector'
import { TranscriptPipeline } from '../src/main/text-polish/pipeline'

const emptyDicts = { misspellings: {}, usToUk: {}, ukToUs: {} }

// ── assembleTranscript ────────────────────────────────────────────────────────

describe('assembleTranscript', () => {
  it('returns empty string for empty array', () => {
    expect(assembleTranscript([])).toBe('')
  })

  it('returns single segment unchanged', () => {
    expect(assembleTranscript(['hello world'])).toBe('hello world')
  })

  it('trims whitespace from segments', () => {
    expect(assembleTranscript(['  hello  '])).toBe('hello')
  })

  it('joins two clean segments with a space', () => {
    expect(assembleTranscript(['hello', 'world'])).toBe('hello world')
  })

  it('deduplicates single overlapping word at boundary', () => {
    expect(assembleTranscript(['hello world', 'world goodbye'])).toBe('hello world goodbye')
  })

  it('deduplicates two overlapping words at boundary', () => {
    expect(assembleTranscript(['one two three', 'two three four'])).toBe('one two three four')
  })

  it('does not strip non-overlapping content', () => {
    expect(assembleTranscript(['the cat sat', 'on the mat'])).toBe('the cat sat on the mat')
  })
})

// ── TextPolisher ──────────────────────────────────────────────────────────────

describe('TextPolisher', () => {
  it('returns empty string for blank input', () => {
    const p = new TextPolisher(emptyDicts)
    expect(p.polish('')).toBe('')
    expect(p.polish('   ')).toBe('')
  })

  it('capitalises first letter', () => {
    const p = new TextPolisher(emptyDicts)
    const result = p.polish('hello world', { fixGrammar: true, removeFillerWords: false })
    expect(result).toMatch(/^Hello/)
  })

  it('adds a full stop when sentence has no ending punctuation', () => {
    const p = new TextPolisher(emptyDicts)
    const result = p.polish('hello world', { fixGrammar: true, removeFillerWords: false })
    expect(result).toMatch(/\.$/)
  })

  it('removes filler words', () => {
    const p = new TextPolisher(emptyDicts)
    const result = p.polish('um hello world', { removeFillerWords: true, fixGrammar: false })
    expect(result).not.toContain('um')
    expect(result).toContain('hello')
  })

  it('capitalises standalone i', () => {
    const p = new TextPolisher(emptyDicts)
    const result = p.polish('i think i can do it', { fixGrammar: true })
    expect(result).toContain('I think I can')
  })

  it('fixes misspellings using provided dictionary', () => {
    const p = new TextPolisher({ misspellings: { teh: 'the' }, usToUk: {}, ukToUs: {} })
    const result = p.polish('teh cat sat', { fixSpelling: true, fixGrammar: false })
    expect(result).toContain('the')
    expect(result).not.toContain('teh')
  })

  it('preserves capitalisation when fixing misspellings', () => {
    const p = new TextPolisher({ misspellings: { teh: 'the' }, usToUk: {}, ukToUs: {} })
    const result = p.polish('Teh cat sat', { fixSpelling: true, fixGrammar: false })
    expect(result).toContain('The')
  })

  it('enforces UK locale', () => {
    const p = new TextPolisher({ misspellings: {}, usToUk: { color: 'colour' }, ukToUs: {} })
    const result = p.polish('the color is red', { locale: 'uk', fixGrammar: false })
    expect(result).toContain('colour')
    expect(result).not.toContain('color')
  })

  it('enforces US locale', () => {
    const p = new TextPolisher({ misspellings: {}, usToUk: {}, ukToUs: { colour: 'color' } })
    const result = p.polish('the colour is red', { locale: 'us', fixGrammar: false })
    expect(result).toContain('color')
    expect(result).not.toContain('colour')
  })

  it('detects and truncates whisper repetition hallucinations', () => {
    const p = new TextPolisher(emptyDicts)
    const repeated = 'the cat sat the the the the the the the the the'
    const result = p.polish(repeated, { fixGrammar: false, removeFillerWords: false })
    expect(result).toContain('...')
  })
})

// ── applyVocabulary ───────────────────────────────────────────────────────────

describe('applyVocabulary', () => {
  it('returns text unchanged with empty dictionary', () => {
    expect(applyVocabulary('hello world', {})).toBe('hello world')
  })

  it('replaces a matched word', () => {
    expect(applyVocabulary('tomorow is friday', { tomorow: 'tomorrow' })).toBe('tomorrow is friday')
  })

  it('preserves capitalisation on replacement', () => {
    expect(applyVocabulary('Tomorow is friday', { tomorow: 'tomorrow' })).toBe('Tomorrow is friday')
  })

  it('preserves all-caps on replacement', () => {
    expect(applyVocabulary('TOMOROW is friday', { tomorow: 'tomorrow' })).toBe('TOMORROW is friday')
  })
})

// ── TranscriptPipeline ────────────────────────────────────────────────────────

describe('TranscriptPipeline', () => {
  it('returns empty string for empty segments', () => {
    const pipeline = new TranscriptPipeline(new TextPolisher(emptyDicts), () => ({}))
    expect(pipeline.process([])).toBe('')
  })

  it('polishes and returns text for single segment', () => {
    const pipeline = new TranscriptPipeline(new TextPolisher(emptyDicts), () => ({}))
    const result = pipeline.process(['hello world'])
    expect(result).toMatch(/^Hello/)
  })

  it('applies vocabulary corrections after polishing', () => {
    const pipeline = new TranscriptPipeline(
      new TextPolisher(emptyDicts),
      () => ({ voiceassist: 'VoiceAssist' }),
    )
    const result = pipeline.process(['voiceassist is ready'])
    expect(result).toContain('VoiceAssist')
  })
})
