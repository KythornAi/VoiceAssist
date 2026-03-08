const { Tray, Menu, app } = require('electron')
const { icons } = require('./icons')

let tray = null

function createTray(appState, actions) {
    tray = new Tray(icons.off)
    tray.setToolTip('VoiceAssist')
    if (process.platform === 'darwin') tray.setTitle(' VA')

    updateTrayMenu(appState, actions)

    tray.on('double-click', actions.toggleControlStrip)

    return tray
}

function updateTrayMenu(appState, actions) {
    if (!tray) return
    const { dictating, processing, reading } = appState

    let statusLabel = '⚫  VoiceAssist — Ready'
    if (dictating) statusLabel = '🔴  Listening...'
    if (processing) statusLabel = '🟡  Processing...'
    if (reading) statusLabel = '🔵  Reading aloud...'

    const menu = Menu.buildFromTemplate([
        { label: statusLabel, enabled: false },
        { type: 'separator' },
        {
            label: dictating ? 'Stop Dictating' : 'Start Dictating',
            click: actions.toggleDictation
        },
        {
            label: reading ? 'Stop Reading' : 'Read Selection',
            click: actions.toggleReading
        },
        { type: 'separator' },
        { label: 'Show Control Strip', click: actions.showControlStrip },
        { label: 'Dictation History...', click: actions.openHistory },
        { label: 'Settings...', click: actions.openSettings },
        { type: 'separator' },
        {
            label: 'Quit VoiceAssist',
            accelerator: process.platform === 'darwin' ? 'Command+Q' : undefined,
            click: () => app.quit()
        },
    ])

    tray.setContextMenu(menu)
}

function setTrayIcon(state) {
    if (!tray) return
    tray.setImage(icons[state] || icons.off)
    const labels = { off: ' VA', listening: ' REC', processing: ' ...', reading: ' TTS' }
    if (process.platform === 'darwin') tray.setTitle(labels[state] || ' VA')
}

module.exports = { createTray, updateTrayMenu, setTrayIcon }
