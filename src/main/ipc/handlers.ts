import { app, ipcMain } from 'electron'
import { IPC } from '../../shared/ipc-contract'
import type { AudioChunkPayload, TranscriptResult } from '../../shared/ipc-contract'
import { SessionManager } from '../session/session-manager'
import { getWindows, showHistory, showSettings } from '../windows/window-manager'
import log from '../logger'

const logger = log.scope('ipc')

export function registerHandlers(session: SessionManager): void {
  session.on('state', (state) => {
    for (const win of Object.values(getWindows())) {
      if (win && !win.isDestroyed()) {
        win.webContents.send(IPC.SESSION_STATE, state)
      }
    }
  })

  session.on('transcript', (result: TranscriptResult) => {
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

  ipcMain.handle(IPC.SESSION_START, () => {
    const sessionId = session.start()
    logger.info('Session started', { sessionId })
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
}
