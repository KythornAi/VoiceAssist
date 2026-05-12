import { BrowserWindow, screen } from 'electron'

// content ~200px + 8px margin each side — transparent compositor border fix (V1 gotcha)
const WIDTH = 220
const HEIGHT = 436

export function createControlStripWindow(preload: string): BrowserWindow {
  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    frame: false,
    transparent: true,
    focusable: false,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    hasShadow: false,
    show: false,
    // macOS: 'panel' keeps window visible above fullscreen apps
    type: process.platform === 'darwin' ? 'panel' : undefined,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.setAlwaysOnTop(true, 'screen-saver')

  const { width } = screen.getPrimaryDisplay().workAreaSize
  win.setPosition(width - WIDTH - 10, 20)

  return win
}
