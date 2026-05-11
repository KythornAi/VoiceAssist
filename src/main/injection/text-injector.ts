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

export async function getSelectedText(): Promise<SelectionResult> {
  if (process.platform !== 'darwin') {
    return { ok: false, reason: 'unsupported-platform', message: 'Get selection only supported on macOS in this build' }
  }
  // Iterate all visible processes for AXSelectedText -- works regardless of which app is frontmost
  try {
    const stdout = await runOsascript([
      'set selectedText to ""',
      'tell application "System Events"',
      'set visProcs to every process whose visible is true and name is not "VoiceAssist"',
      'repeat with p in visProcs',
      'try',
      'set fe to value of attribute "AXFocusedUIElement" of p',
      'set st to value of attribute "AXSelectedText" of fe',
      'if st is not "" then',
      'set selectedText to st',
      'exit repeat',
      'end if',
      'end try',
      'end repeat',
      'end tell',
      'return selectedText',
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
