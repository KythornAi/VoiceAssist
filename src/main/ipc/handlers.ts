import { app, clipboard, ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-contract'
import type { AudioChunkPayload, TranscriptResult, SessionErrorPayload } from '../../shared/ipc-contract'
import type { PolishSettings, SttSettings, FormatMode } from '../../shared/types'
import { SessionManager } from '../session/session-manager'
import { getWindows, showHistory, showSettings } from '../windows/window-manager'
import { JsonStore } from '../store/json-store'
import { SecretStore } from '../store/secret-store'
import { HistoryStore } from '../store/history-store'
import { injectPaste, getSelectedText } from '../injection/text-injector'
import * as ttsEngine from '../tts/tts-engine'
import log from '../logger'

const logger = log.scope('ipc')

export function registerHandlers(
  session: SessionManager,
  settingsStore: JsonStore<PolishSettings>,
  sttSettingsStore: JsonStore<SttSettings>,
  secretStore: SecretStore,
  vocabStore: JsonStore<{ entries: Record<string, string> }>,
  historyStore: HistoryStore,
): void {
  ttsEngine.onStateChange((state) => {
    for (const win of Object.values(getWindows())) {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC.TTS_STATE, state)
      }
    }
  })

  session.on('state', (state) => {
    for (const win of Object.values(getWindows())) {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC.SESSION_STATE, state)
      }
    }
  })

  session.on('stt-error', (payload: SessionErrorPayload) => {
    logger.error('STT error, broadcasting to renderer', payload)
    for (const win of Object.values(getWindows())) {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC.SESSION_ERROR, payload)
      }
    }
  })

  session.on('transcript', async (result: TranscriptResult) => {
    historyStore.add(result.text)
    clipboard.writeText(result.text)
    logger.info('Transcript ready', { sessionId: result.sessionId, chars: result.text.length })

    for (const win of Object.values(getWindows())) {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC.SESSION_TRANSCRIPT, result)
      }
    }

    if (settingsStore.get('pasteAtCursor')) {
      const r = await injectPaste()
      if (!r.ok) {
        logger.warn('Auto-paste failed', r)
        const errorPayload: SessionErrorPayload = { message: r.message }
        for (const win of Object.values(getWindows())) {
          if (win && !win.isDestroyed()) {
            win.webContents.send(IPC.SESSION_ERROR, errorPayload)
          }
        }
      }
    }
  })

  ipcMain.handle(IPC.APP_PING, () => ({
    ok: true as const,
    version: app.getVersion(),
  }))

  ipcMain.handle(IPC.SESSION_START, (_e, { formatMode }: { formatMode: FormatMode }) => {
    const sessionId = session.start(formatMode)
    logger.info('Session started', { sessionId, formatMode })
    return { sessionId }
  })

  ipcMain.handle(IPC.SESSION_STOP, (_e, { sessionId }: { sessionId: string }) => {
    const chunks = session.stop(sessionId)
    logger.info('Session stopped', { sessionId, chunks })
    return { chunks }
  })

  ipcMain.handle(IPC.SESSION_CANCEL, (_e, { sessionId }: { sessionId: string }) => {
    session.cancel(sessionId)
    logger.info('Session cancelled', { sessionId })
  })

  ipcMain.on(IPC.AUDIO_CHUNK, (_e, payload: AudioChunkPayload) => {
    session.receiveChunk(payload.sessionId, payload.buffer)
  })

  ipcMain.handle(IPC.OPEN_SETTINGS, () => showSettings())
  ipcMain.handle(IPC.OPEN_HISTORY, () => showHistory())

  ipcMain.handle(IPC.SETTINGS_GET, () => settingsStore.getAll())

  ipcMain.handle(IPC.SETTINGS_SET, (_e, patch: Partial<PolishSettings>) => {
    for (const [k, v] of Object.entries(patch)) {
      settingsStore.set(k as keyof PolishSettings, v as PolishSettings[keyof PolishSettings])
    }
    logger.info('Settings updated', patch)
  })

  ipcMain.handle(IPC.VOCAB_GET, () => vocabStore.get('entries'))

  ipcMain.handle(IPC.VOCAB_SET, (_e, { key, value }: { key: string; value: string }) => {
    const current = vocabStore.get('entries')
    vocabStore.set('entries', { ...current, [key.toLowerCase()]: value })
    logger.info('Vocab entry set', { key, value })
  })

  ipcMain.handle(IPC.VOCAB_DELETE, (_e, { key }: { key: string }) => {
    const current = vocabStore.get('entries')
    const { [key.toLowerCase()]: _removed, ...rest } = current
    vocabStore.set('entries', rest)
    logger.info('Vocab entry deleted', { key })
  })

  ipcMain.handle(IPC.HISTORY_GET, () => historyStore.getAll())

  ipcMain.handle(IPC.HISTORY_CLEAR, () => {
    historyStore.clear()
    logger.info('History cleared')
  })

  ipcMain.handle(IPC.STT_SETTINGS_GET, () => sttSettingsStore.getAll())

  ipcMain.handle(IPC.STT_SETTINGS_SET, (_e, patch: Partial<SttSettings>) => {
    for (const [k, v] of Object.entries(patch)) {
      sttSettingsStore.set(k as keyof SttSettings, v as SttSettings[keyof SttSettings])
    }
    logger.info('STT settings updated', patch)
  })

  ipcMain.handle(IPC.SECRET_SET_OPENAI_KEY, (_e, key: string) => {
    secretStore.setOpenAIKey(key)
    logger.info('OpenAI key saved')
  })

  ipcMain.handle(IPC.SECRET_HAS_OPENAI_KEY, () => secretStore.hasOpenAIKey())

  ipcMain.handle(IPC.SECRET_CLEAR_OPENAI_KEY, () => {
    secretStore.clearOpenAIKey()
    logger.info('OpenAI key cleared')
  })

  ipcMain.handle(IPC.TTS_SPEAK, (_e, text: string) => {
    void ttsEngine.speak(text)
    logger.info('TTS speak requested', { chars: text.length })
  })

  ipcMain.handle(IPC.TTS_STOP, () => {
    ttsEngine.stop()
    logger.info('TTS stop requested')
  })

  ipcMain.handle(IPC.TTS_READ, async () => {
    if (ttsEngine.isSpeaking()) {
      ttsEngine.stop()
      return
    }
    const result = await getSelectedText()
    logger.info('TTS_READ selection', { ok: result.ok, chars: result.ok ? result.text.length : 0 })
    if (!result.ok) {
      for (const win of Object.values(getWindows())) {
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC.SESSION_ERROR, { message: result.message })
        }
      }
      return
    }
    if (!result.text.trim()) {
      for (const win of Object.values(getWindows())) {
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC.SESSION_ERROR, { message: 'No text selected -- select text in any app then click Read' })
        }
      }
      return
    }
    void ttsEngine.speak(result.text)
  })
}
