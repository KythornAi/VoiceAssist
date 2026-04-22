import { app, clipboard, ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-contract'
import type { AudioChunkPayload, TranscriptResult } from '../../shared/ipc-contract'
import type { PolishSettings, FormatMode } from '../../shared/types'
import { SessionManager } from '../session/session-manager'
import { getWindows, showHistory, showSettings } from '../windows/window-manager'
import { JsonStore } from '../store/json-store'
import { HistoryStore } from '../store/history-store'
import log from '../logger'

const logger = log.scope('ipc')

export function registerHandlers(
  session: SessionManager,
  settingsStore: JsonStore<PolishSettings>,
  vocabStore: JsonStore<{ entries: Record<string, string> }>,
  historyStore: HistoryStore,
): void {
  session.on('state', (state) => {
    for (const win of Object.values(getWindows())) {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC.SESSION_STATE, state)
      }
    }
  })

  session.on('transcript', (result: TranscriptResult) => {
    historyStore.add(result.text)
    clipboard.writeText(result.text)
    logger.info('Transcript ready', { sessionId: result.sessionId, chars: result.text.length })
    for (const win of Object.values(getWindows())) {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC.SESSION_TRANSCRIPT, result)
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
}
