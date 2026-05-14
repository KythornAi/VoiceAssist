import { BrowserWindow } from 'electron'

export function createSettingsWindow(preload: string): BrowserWindow {
  return new BrowserWindow({
    width: 700,
    height: 620,
    minWidth: 580,
    minHeight: 500,
    title: 'VoiceAssist — Settings',
    show: false,
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
}
