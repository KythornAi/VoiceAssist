import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export type InjectionResult =
  | { ok: true }
  | { ok: false; reason: 'permission-denied' | 'unsupported-platform' | 'unknown'; message: string }

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
