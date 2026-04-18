import { app, BrowserWindow } from 'electron'
import log from './logger'
import { createAllWindows } from './windows/window-manager'

const logger = log.scope('app')

app.whenReady().then(() => {
  logger.info('App ready')
  createAllWindows()

  // macOS: re-create windows if all closed via dock click (tray added in Phase 6)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createAllWindows()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
