import { app, BrowserWindow, globalShortcut } from 'electron'
import log from './logger'
import { createAllWindows, getWindows } from './windows/window-manager'
import { SessionManager } from './session/session-manager'
import { WhisperSttEngine } from './stt/stt-engine'
import { registerHandlers } from './ipc/handlers'
import { IPC } from '../shared/ipc-contract'
import { loadTextPolisher, getDictBasePath } from './text-polish/text-polish'
import { TranscriptPipeline } from './text-polish/pipeline'
import { JsonStore } from './store/json-store'
import { createSettingsStore } from './store/settings-store'
import { HistoryStore } from './store/history-store'
import type { HistoryItem } from '../shared/types'

const logger = log.scope('app')

app.whenReady().then(() => {
  logger.info('App ready')
  const stt = new WhisperSttEngine()
  const settingsStore = createSettingsStore()
  const vocabStore = new JsonStore<{ entries: Record<string, string> }>('vocabulary.json', { entries: {} })
  const historyStore = new HistoryStore(
    new JsonStore<{ items: HistoryItem[] }>('history.json', { items: [] }),
  )
  const polisher = loadTextPolisher(getDictBasePath())
  const pipeline = new TranscriptPipeline(
    polisher,
    () => vocabStore.get('entries'),
    () => settingsStore.getAll(),
  )
  const session = new SessionManager(stt, pipeline)
  registerHandlers(session, settingsStore, vocabStore, historyStore)
  createAllWindows()

  globalShortcut.register('Control+Shift+D', () => {
    const strip = getWindows().controlStrip
    if (strip && !strip.isDestroyed()) {
      strip.webContents.send(IPC.HOTKEY_TOGGLE)
    }
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createAllWindows()
    }
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
