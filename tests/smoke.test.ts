import { describe, expect, it } from 'vitest'
import { SessionManager } from '../src/main/session/session-manager'

describe('SessionManager', () => {
  it('starts in idle state', () => {
    const sm = new SessionManager()
    expect(sm.getState()).toBe('idle')
  })
})
