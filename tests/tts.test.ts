import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock child_process before importing modules that use it
vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  exec: vi.fn(),
  execSync: vi.fn(),
}))

import { spawn, exec } from 'node:child_process'
import { EventEmitter } from 'node:events'

const mockedSpawn = spawn as unknown as ReturnType<typeof vi.fn>
const mockedExec = exec as unknown as ReturnType<typeof vi.fn>

// Helper: create a fake ChildProcess-like EventEmitter with writable stdin
function fakeProc() {
  const proc = new EventEmitter() as ReturnType<typeof vi.fn> & EventEmitter & {
    kill: ReturnType<typeof vi.fn>
    stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }
    stdout: EventEmitter
    stderr: EventEmitter
  }
  proc.kill = vi.fn(() => { proc.emit('close', null, 'SIGTERM') })
  proc.stdin = { write: vi.fn(), end: vi.fn() }
  proc.stdout = new EventEmitter()
  proc.stderr = new EventEmitter()
  return proc
}

beforeEach(() => {
  vi.resetAllMocks()
})

// ---- say-speaker ----

describe('say-speaker', () => {
  it('isSpeaking returns false initially', async () => {
    const { isSpeaking } = await import('../src/main/tts/say-speaker')
    expect(isSpeaking()).toBe(false)
  })

  it('speak spawns say with text as argument', async () => {
    const proc = fakeProc()
    mockedSpawn.mockReturnValue(proc)

    const { speak, isSpeaking } = await import('../src/main/tts/say-speaker')
    const promise = speak('Hello world')

    expect(mockedSpawn).toHaveBeenCalledWith('say', ['Hello world'])
    expect(isSpeaking()).toBe(true)

    proc.emit('close', 0, null)
    await promise
    expect(isSpeaking()).toBe(false)
  })

  it('stop kills active process', async () => {
    const proc = fakeProc()
    mockedSpawn.mockReturnValue(proc)

    const { speak, stop, isSpeaking } = await import('../src/main/tts/say-speaker')
    void speak('test')
    expect(isSpeaking()).toBe(true)

    stop()
    expect(proc.kill).toHaveBeenCalled()
    expect(isSpeaking()).toBe(false)
  })

  it('speak resolves on error without throwing', async () => {
    const proc = fakeProc()
    mockedSpawn.mockReturnValue(proc)

    const { speak } = await import('../src/main/tts/say-speaker')
    const promise = speak('test')

    proc.emit('error', new Error('say not found'))
    await expect(promise).resolves.toBeUndefined()
  })
})

// ---- getSelectedText ----

describe('getSelectedText', () => {
  type ExecCallback = (err: Error | null, stdout?: string, stderr?: string) => void

  it('returns unsupported-platform on non-darwin', async () => {
    const original = process.platform
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })

    const { getSelectedText } = await import('../src/main/injection/text-injector')
    const result = await getSelectedText()

    expect(result).toEqual({
      ok: false,
      reason: 'unsupported-platform',
      message: 'Get selection only supported on macOS in this build',
    })

    Object.defineProperty(process, 'platform', { value: original, configurable: true })
  })

  it('returns selected text when clipboard changes', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    mockedExec.mockImplementation((_cmd: string, cb: ExecCallback) => {
      cb(null, 'selected text', '')
    })

    const { getSelectedText } = await import('../src/main/injection/text-injector')
    const result = await getSelectedText()

    expect(result).toEqual({ ok: true, text: 'selected text' })
  })

  it('returns empty text when nothing is selected (osascript returns empty)', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    mockedExec.mockImplementation((_cmd: string, cb: ExecCallback) => {
      cb(null, '', '')
    })

    const { getSelectedText } = await import('../src/main/injection/text-injector')
    const result = await getSelectedText()

    expect(result).toEqual({ ok: true, text: '' })
  })

  it('returns permission-denied on assistive access error', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true })
    mockedExec.mockImplementation((_cmd: string, cb: ExecCallback) => {
      cb(new Error('osascript failed'), '', 'not allowed assistive access')
    })

    const { getSelectedText } = await import('../src/main/injection/text-injector')
    const result = await getSelectedText()

    expect(result).toEqual({
      ok: false,
      reason: 'permission-denied',
      message: 'Grant Accessibility access to VoiceAssist in System Settings → Privacy & Security → Accessibility',
    })
  })
})
