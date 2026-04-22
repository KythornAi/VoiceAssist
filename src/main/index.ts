import { app, BrowserWindow } from 'electron'
import log from './logger'
import { createAllWindows } from './windows/window-manager'
import { SessionManager } from './session/session-manager'
import { WhisperSttEngine } from './stt/stt-engine'
import { registerHandlers } from './ipc/handlers'
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

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createAllWindows()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
