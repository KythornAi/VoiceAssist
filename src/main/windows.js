const { BrowserWindow, screen } = require('electron')
const path = require('path')

const isDev = process.env.NODE_ENV !== 'production'
const RENDERER_URL = process.env['ELECTRON_RENDERER_URL']

// Load the unified renderer with a ?window= query param to select the UI
function loadWindow(win, name) {
    if (isDev && RENDERER_URL) {
        win.loadURL(`${RENDERER_URL}/index.html?window=${name}`)
    } else {
        win.loadFile(
            path.join(__dirname, '../renderer/index.html'),
            { query: { window: name } }
        )
    }
}

function getPreload() {
    return path.join(__dirname, '../preload/index.js')
}

let controlStripWin = null
let settingsWin = null
let historyWin = null

function createControlStripWindow() {
    if (controlStripWin && !controlStripWin.isDestroyed()) { controlStripWin.show(); return controlStripWin }

    controlStripWin = new BrowserWindow({
        width: 310, height: 420,
        frame: false,
        transparent: false,
        backgroundColor: '#111920',
        roundedCorners: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        movable: true,
        hasShadow: true,
        show: false,
        webPreferences: { preload: getPreload(), contextIsolation: true, nodeIntegration: false }
    })

    const { width } = screen.getPrimaryDisplay().workAreaSize
    controlStripWin.setPosition(width - 320, 20)
    loadWindow(controlStripWin, 'control-strip')
    controlStripWin.once('ready-to-show', () => controlStripWin.show())
    controlStripWin.on('closed', () => { controlStripWin = null })
    return controlStripWin
}

function createSettingsWindow() {
    if (settingsWin && !settingsWin.isDestroyed()) { settingsWin.focus(); return settingsWin }

    settingsWin = new BrowserWindow({
        width: 700, height: 620,
        minWidth: 580, minHeight: 500,
        title: 'VoiceAssist — Settings',
        show: false,
        webPreferences: { preload: getPreload(), contextIsolation: true, nodeIntegration: false }
    })

    loadWindow(settingsWin, 'settings')
    settingsWin.once('ready-to-show', () => settingsWin.show())
    settingsWin.on('closed', () => { settingsWin = null })
    return settingsWin
}

function createHistoryWindow() {
    if (historyWin && !historyWin.isDestroyed()) { historyWin.focus(); return historyWin }

    historyWin = new BrowserWindow({
        width: 520, height: 620,
        minWidth: 400, minHeight: 400,
        title: 'VoiceAssist — Dictation History',
        show: false,
        webPreferences: { preload: getPreload(), contextIsolation: true, nodeIntegration: false }
    })

    loadWindow(historyWin, 'history')
    historyWin.once('ready-to-show', () => historyWin.show())
    historyWin.on('closed', () => { historyWin = null })
    return historyWin
}

function getWindows() {
    return { controlStripWin, settingsWin, historyWin }
}

module.exports = { createControlStripWindow, createSettingsWindow, createHistoryWindow, getWindows }
