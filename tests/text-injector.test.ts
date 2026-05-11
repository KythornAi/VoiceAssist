import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('node:child_process', () => ({ exec: vi.fn() }))

import { exec } from 'node:child_process'
import { injectPaste } from '../src/main/injection/text-injector'

type ExecCallback = (err: Error | null, stdout?: string, stderr?: string) => void
const mockedExec = exec as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetAllMocks()
})

describe('injectPaste', () => {
  it('returns unsupported-platform on non-darwin', async () => {
    const original = process.platform
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })

    const result = await injectPaste()

    expect(result).toEqual({
      ok: false,
      reason: 'unsupported-platform',
      message: 'Auto-paste only supported on macOS in this build',
    })

    Object.defineProperty(process, 'platform', { value: original, configurable: true })
  })

  it('returns ok:true when exec resolves', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    mockedExec.mockImplementation((_cmd: string, cb: ExecCallback) => { cb(null, '', '') })

    const result = await injectPaste()

    expect(result).toEqual({ ok: true })
  })

  it('returns permission-denied when exec rejects with assistive access error', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    const error = Object.assign(new Error('osascript failed'), { stderr: 'not allowed assistive access' })
    mockedExec.mockImplementation((_cmd: string, cb: ExecCallback) => { cb(error) })

    const result = await injectPaste()

    expect(result).toEqual({
      ok: false,
      reason: 'permission-denied',
      message: 'Grant Accessibility access to VoiceAssist in System Settings → Privacy & Security → Accessibility',
    })
  })
})
