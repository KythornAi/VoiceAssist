import { execFile } from 'node:child_process'

function runOsascript(lines: string[]): Promise<string> {
  const args = lines.flatMap(line => ['-e', line])
  return new Promise((resolve, reject) => {
    execFile('/usr/bin/osascript', args, (err, stdout, stderr) => {
      if (err) reject(Object.assign(err, { stderr }))
      else resolve(stdout)
    })
  })
}

export type InjectionResult =
  | { ok: true }
  | { ok: false; reason: 'permission-denied' | 'unsupported-platform' | 'unknown'; message: string }

export type SelectionResult =
  | { ok: true; text: string }
  | { ok: false; reason: 'permission-denied' | 'unsupported-platform' | 'unknown'; message: string }

function isPermissionError(stderr: string): boolean {
  return /assistive access|not authori[sz]ed|-1719|not allowed to send keystrokes|1002/i.test(stderr)
}

function extractStderr(err: unknown): string {
  return err instanceof Error && 'stderr' in err ? String((err as { stderr: unknown }).stderr) : String(err)
}

// Track which external app was last frontmost so we can target it directly,
// even when VoiceAssist has focus (e.g. after clicking the Read button).
let _lastExternalApp: string | null = null

if (process.platform === 'darwin') {
  setInterval(() => {
    runOsascript([
      'tell application "System Events"',
      'set p to first application process whose frontmost is true',
      'if name of p is not "VoiceAssist" then',
      'return name of p',
      'end if',
      'end tell',
      'return ""',
    ])
      .then(name => { if (name.trim()) _lastExternalApp = name.trim() })
      .catch(() => undefined)
  }, 500)
}

export async function getSelectedText(): Promise<SelectionResult> {
  if (process.platform !== 'darwin') {
    return { ok: false, reason: 'unsupported-platform', message: 'Get selection only supported on macOS in this build' }
  }
  const target = _lastExternalApp
  const keystrokeLines = target
    ? [`tell process "${target}"`, 'keystroke "c" using command down', 'end tell']
    : ['keystroke "c" using command down']

  try {
    const stdout = await runOsascript([
      'set oldClip to ""',
      'try',
      'set oldClip to the clipboard',
      'end try',
      'tell application "System Events"',
      ...keystrokeLines,
      'end tell',
      'delay 0.15',
      'set newClip to the clipboard',
      'try',
      'set the clipboard to oldClip',
      'end try',
      'if newClip is oldClip then return ""',
      'return newClip',
    ])
    return { ok: true, text: stdout.trim() }
  } catch (err) {
    const stderr = extractStderr(err)
    if (isPermissionError(stderr)) {
      return {
        ok: false,
        reason: 'permission-denied',
        message: 'Grant Accessibility access to VoiceAssist in System Settings → Privacy & Security → Accessibility',
      }
    }
    return { ok: false, reason: 'unknown', message: stderr.trim() || 'Failed to get selection' }
  }
}

export async function injectPaste(): Promise<InjectionResult> {
  if (process.platform !== 'darwin') {
    return { ok: false, reason: 'unsupported-platform', message: 'Auto-paste only supported on macOS in this build' }
  }
  try {
    await runOsascript(['tell application "System Events" to keystroke "v" using command down'])
    return { ok: true }
  } catch (err) {
    const stderr = extractStderr(err)
    if (isPermissionError(stderr)) {
      return {
        ok: false,
        reason: 'permission-denied',
        message: 'Grant Accessibility access to VoiceAssist in System Settings → Privacy & Security → Accessibility',
      }
    }
    return { ok: false, reason: 'unknown', message: stderr.trim() || 'Paste failed' }
  }
}
