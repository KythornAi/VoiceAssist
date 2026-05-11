import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

function execToString(cmd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
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

export async function getSelectedText(): Promise<SelectionResult> {
  if (process.platform !== 'darwin') {
    return { ok: false, reason: 'unsupported-platform', message: 'Get selection only supported on macOS in this build' }
  }
  // One atomic osascript call: save clipboard, Cmd+C, compare, return selection or empty
  // Lines are all hardcoded constants -- no injection risk in the shell string
  const cmd = [
    'set savedClip to ""',
    'try',
    'set savedClip to the clipboard',
    'end try',
    'tell application "System Events" to keystroke "c" using command down',
    'delay 0.15',
    'set newClip to the clipboard',
    'if newClip is equal to savedClip then',
    'return ""',
    'else',
    'return newClip',
    'end if',
  ].map(line => `-e '${line}'`).join(' ')
  try {
    const stdout = await execToString(`osascript ${cmd}`)
    return { ok: true, text: stdout.trim() }
  } catch (err) {
    const stderr = err instanceof Error && 'stderr' in err ? String((err as { stderr: unknown }).stderr) : String(err)
    if (/assistive access|not authori[sz]ed|-1719/i.test(stderr)) {
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
    await execAsync(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`)
    return { ok: true }
  } catch (err) {
    const stderr = err instanceof Error && 'stderr' in err ? String((err as { stderr: unknown }).stderr) : String(err)
    if (/assistive access|not authori[sz]ed|-1719/i.test(stderr)) {
      return {
        ok: false,
        reason: 'permission-denied',
        message: 'Grant Accessibility access to VoiceAssist in System Settings → Privacy & Security → Accessibility',
      }
    }
    return { ok: false, reason: 'unknown', message: stderr.trim() || 'Paste failed' }
  }
}
