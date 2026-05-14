import { app, BrowserWindow, globalShortcut, systemPreferences } from 'electron'
import log from './logger'
import { createAllWindows, getWindows } from './windows/window-manager'
import { SessionManager } from './session/session-manager'
import { SttRouter } from './stt/stt-router'
import { registerHandlers } from './ipc/handlers'
import { IPC } from '../shared/ipc-contract'
import { loadTextPolisher, getDictBasePath } from './text-polish/text-polish'
import { getSelectedText, getLastExternalApp } from './injection/text-injector'
import * as ttsEngine from './tts/tts-engine'
import { TranscriptPipeline } from './text-polish/pipeline'
import { JsonStore } from './store/json-store'
import { createSettingsStore, createSttSettingsStore, createTtsSettingsStore } from './store/settings-store'
import { SecretStore } from './store/secret-store'
import { HistoryStore } from './store/history-store'
import type { HistoryItem } from '../shared/types'

const logger = log.scope('app')

app.whenReady().then(() => {
  logger.info('App ready')
  if (process.platform === 'darwin') {
    const trusted = systemPreferences.isTrustedAccessibilityClient(true)
    logger.info('Accessibility trusted', { trusted })
  }
  const settingsStore = createSettingsStore()
  const sttSettingsStore = createSttSettingsStore()
  const ttsSettingsStore = createTtsSettingsStore()
  const secretStore = new SecretStore()
  ttsEngine.init(ttsSettingsStore, () => secretStore.getOpenAIKey())
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
  registerHandlers(session, settingsStore, sttSettingsStore, ttsSettingsStore, secretStore, vocabStore, historyStore)
  createAllWindows()

  globalShortcut.register('Control+Shift+D', () => {
    const strip = getWindows().controlStrip
    if (strip && !strip.isDestroyed()) {
      strip.webContents.send(IPC.HOTKEY_TOGGLE)
    }
  })

  const ttsRegistered = globalShortcut.register('Control+R', async () => {
    logger.info('Ctrl+R fired', { speaking: ttsEngine.isSpeaking() })
    if (ttsEngine.isSpeaking()) {
      ttsEngine.stop()
      return
    }
    logger.info('Ctrl+R: target app', { target: getLastExternalApp() })
    await new Promise(resolve => setTimeout(resolve, 200))
    const result = await getSelectedText()
    logger.info('getSelectedText result', { ok: result.ok, chars: result.ok ? result.text.length : 0 })
    if (!result.ok) {
      logger.warn('TTS selection failed', result)
      for (const win of Object.values(getWindows())) {
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC.SESSION_ERROR, { message: result.message })
        }
      }
      return
    }
    if (!result.text.trim()) {
      logger.info('Ctrl+R: no text selected')
      for (const win of Object.values(getWindows())) {
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC.SESSION_ERROR, { message: 'No text selected -- select text in any app then press Ctrl+R' })
        }
      }
      return
    }
    void ttsEngine.speak(result.text)
  })
  logger.info('Ctrl+R registered', { ttsRegistered })

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
