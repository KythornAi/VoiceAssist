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
    it('structures full email with greeting and sign-off', () => {
      expect(applyFormat('Hi Sarah, I wanted to follow up on the proposal. Let me know your thoughts. Thanks, Kyle', 'email'))
        .toBe('Hi Sarah,\n\nI wanted to follow up on the proposal. Let me know your thoughts.\n\nThanks, Kyle')
    })

    it('structures email with Dear greeting', () => {
      expect(applyFormat('Dear John, Please find attached the report. Kind regards, Kyle', 'email'))
        .toBe('Dear John,\n\nPlease find attached the report.\n\nKind regards, Kyle')
    })

    it('separates sign-off without greeting', () => {
      expect(applyFormat('Just checking in on the project. Best regards, Kyle', 'email'))
        .toBe('Just checking in on the project.\n\nBest regards, Kyle')
    })

    it('separates greeting without sign-off', () => {
      expect(applyFormat('Hi Team, please review the attached document when you get a chance.', 'email'))
        .toBe('Hi Team,\n\nPlease review the attached document when you get a chance.')
    })

    it('falls back to capitalise and full stop for plain body', () => {
      expect(applyFormat('hello world', 'email')).toBe('Hello world.')
    })

    it('does not duplicate trailing full stop on plain body', () => {
      expect(applyFormat('Hello world.', 'email')).toBe('Hello world.')
    })

    it('preserves exclamation mark on plain body', () => {
      expect(applyFormat('Hello world!', 'email')).toBe('Hello world!')
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
