import { app, BrowserWindow, globalShortcut } from 'electron'
import log from './logger'
import { createAllWindows, getWindows } from './windows/window-manager'
import { SessionManager } from './session/session-manager'
import { SttRouter } from './stt/stt-router'
import { registerHandlers } from './ipc/handlers'
import { IPC } from '../shared/ipc-contract'
import { loadTextPolisher, getDictBasePath } from './text-polish/text-polish'
import { TranscriptPipeline } from './text-polish/pipeline'
import { JsonStore } from './store/json-store'
import { createSettingsStore, createSttSettingsStore } from './store/settings-store'
import { SecretStore } from './store/secret-store'
import { HistoryStore } from './store/history-store'
import type { HistoryItem } from '../shared/types'

const logger = log.scope('app')

app.whenReady().then(() => {
  logger.info('App ready')
  const settingsStore = createSettingsStore()
  const sttSettingsStore = createSttSettingsStore()
  const secretStore = new SecretStore()
  const vocabStore = new JsonStore<{ entries: Record<string, string> }>('vocabulary.json', { entries: {} })
  const historyStore = new HistoryStore(
    new JsonStore<{ items: HistoryItem[] }>('history.json', { items: [] }),
  )
  const stt = new SttRouter(sttSettingsStore, secretStore, () => vocabStore.get('entries'))
  const polisher = loadTextPolisher(getDictBasePath())
  const pipeline = new TranscriptPipeline(
    polisher,
    () => vocabStore.get('entries'),
    () => settingsStore.getAll(),
  )
  const session = new SessionManager(stt, pipeline)
  registerHandlers(session, settingsStore, sttSettingsStore, secretStore, vocabStore, historyStore)
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
