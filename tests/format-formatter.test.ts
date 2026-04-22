import { describe, it, expect } from 'vitest'
import { applyFormat } from '../src/main/text-polish/format-formatter'

describe('applyFormat', () => {
  describe('note mode', () => {
    it('returns text unchanged', () => {
      expect(applyFormat('hello world', 'note')).toBe('hello world')
    })

    it('preserves existing punctuation', () => {
      expect(applyFormat('Hello world.', 'note')).toBe('Hello world.')
    })
  })

  describe('email mode', () => {
    it('capitalises first letter', () => {
      expect(applyFormat('hello world.', 'email')).toBe('Hello world.')
    })

    it('adds trailing full stop when missing', () => {
      expect(applyFormat('Hello world', 'email')).toBe('Hello world.')
    })

    it('does not duplicate trailing full stop', () => {
      expect(applyFormat('Hello world.', 'email')).toBe('Hello world.')
    })

    it('preserves exclamation mark', () => {
      expect(applyFormat('Hello world!', 'email')).toBe('Hello world!')
    })

    it('preserves question mark', () => {
      expect(applyFormat('Is this right?', 'email')).toBe('Is this right?')
    })

    it('handles empty string', () => {
      expect(applyFormat('', 'email')).toBe('')
    })
  })

  describe('chat mode', () => {
    it('strips trailing full stop', () => {
      expect(applyFormat('Hey how are you.', 'chat')).toBe('Hey how are you')
    })

    it('preserves text without trailing full stop', () => {
      expect(applyFormat('Hey how are you', 'chat')).toBe('Hey how are you')
    })

    it('preserves exclamation mark', () => {
      expect(applyFormat('Sounds great!', 'chat')).toBe('Sounds great!')
    })

    it('only strips the final full stop', () => {
      expect(applyFormat('Mr. Smith is here.', 'chat')).toBe('Mr. Smith is here')
    })
  })

  describe('terminal mode', () => {
    it('lowercases everything', () => {
      expect(applyFormat('Git Status', 'terminal')).toBe('git status')
    })

    it('strips punctuation', () => {
      expect(applyFormat('npm run dev.', 'terminal')).toBe('npm run dev')
    })

    it('strips commas', () => {
      expect(applyFormat('git add, commit', 'terminal')).toBe('git add commit')
    })

    it('collapses extra whitespace', () => {
      expect(applyFormat('git  status', 'terminal')).toBe('git status')
    })

    it('handles a real command phrase', () => {
      expect(applyFormat('Git Status, please.', 'terminal')).toBe('git status please')
    })
  })
})
