import { BrowserWindow } from 'electron'

export function createHistoryWindow(preload: string): BrowserWindow {
  return new BrowserWindow({
    width: 520,
    height: 620,
    minWidth: 400,
    minHeight: 400,
    title: 'VoiceAssist — Dictation History',
    show: false,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
}
