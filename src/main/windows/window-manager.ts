import { BrowserWindow } from 'electron'
import { join } from 'path'
import { createControlStripWindow } from './control-strip'
import { createSettingsWindow } from './settings'
import { createHistoryWindow } from './history'

const PRELOAD = join(__dirname, '../preload/index.js')

interface WindowRefs {
  controlStrip: BrowserWindow | null
  settings: BrowserWindow | null
  history: BrowserWindow | null
}

const refs: WindowRefs = {
  controlStrip: null,
  settings: null,
  history: null,
}

function loadRenderer(win: BrowserWindow, entry: string): void {
  const url = process.env['ELECTRON_RENDERER_URL']
  if (url) {
    win.loadURL(`${url}/${entry}/index.html`)
  } else {
    win.loadFile(join(__dirname, `../renderer/${entry}/index.html`))
  }
}

export function createAllWindows(): void {
  const strip = createControlStripWindow(PRELOAD)
  loadRenderer(strip, 'control-strip')
  strip.once('ready-to-show', () => strip.show())
  strip.on('closed', () => { refs.controlStrip = null })
  refs.controlStrip = strip

  // Pre-create settings + history for fast open; they start hidden
  const settings = createSettingsWindow(PRELOAD)
  loadRenderer(settings, 'settings')
  settings.on('closed', () => { refs.settings = null })
  refs.settings = settings

  const history = createHistoryWindow(PRELOAD)
  loadRenderer(history, 'history')
  history.on('closed', () => { refs.history = null })
  refs.history = history
}

export function showSettings(): void {
  if (!refs.settings || refs.settings.isDestroyed()) {
    // Recreate on demand with ready-to-show guard (avoids blank flash)
    const win = createSettingsWindow(PRELOAD)
    loadRenderer(win, 'settings')
    win.on('closed', () => { refs.settings = null })
    // V1 gotcha: must focus explicitly — control strip alwaysOnTop can bury it
    win.once('ready-to-show', () => { win.show(); win.focus() })
    refs.settings = win
    return
  }
  refs.settings.show()
  refs.settings.focus()
}

export function showHistory(): void {
  if (!refs.history || refs.history.isDestroyed()) {
    const win = createHistoryWindow(PRELOAD)
    loadRenderer(win, 'history')
    win.on('closed', () => { refs.history = null })
    win.once('ready-to-show', () => { win.show(); win.focus() })
    refs.history = win
    return
  }
  refs.history.show()
  refs.history.focus()
}

export function getWindows(): Readonly<WindowRefs> {
  return refs
}
