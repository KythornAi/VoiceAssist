'use strict'

import {
    app, ipcMain, clipboard, BrowserWindow,
    Tray, Menu, nativeImage, globalShortcut, screen,
    systemPreferences, dialog
} from 'electron'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { transcribe, checkWhisperReady } from './whisper-sidecar.js'
import { polishText } from './text-polish.js'
import { synthesise, checkPiperReady, listVoices } from './piper-sidecar.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ================================================================
// ICONS
// ================================================================
function makeCircle(r, g, b) {
    const size = process.platform === 'win32' ? 16 : 22
    const buf = Buffer.alloc(size * size * 4)
    const cx = size / 2
    const cy = size / 2
    const radius = size / 2 - 1.5
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
            const i = (y * size + x) * 4
            const a = d <= radius ? (d > radius - 1 ? Math.round((radius - d) * 255) : 255) : 0
            buf.set([r, g, b, a], i)
        }
    }
    return nativeImage.createFromBuffer(buf, { width: size, height: size })
}
const ICONS = {};

// ================================================================
// STORE
// ================================================================
const DEFAULTS = {
    dictationHotkey: process.platform === 'darwin' ? 'Command+Shift+Space' : 'Control+Shift+Space',
    readHotkey: process.platform === 'darwin' ? 'Command+Alt+R' : 'Control+Alt+R',
    autoPunctuation: true,
    removeFillerWords: true,
    soundEffects: true,
    microphone: 'default',
    language: 'en-US',
    voice: 'en-US-AriaNeural',
    translationLanguage: 'en',
    readingSpeed: 1.0,
    showControlStrip: true,
    launchAtStartup: false,
    spellingLocale: 'uk',
    fixSpelling: true,
    fixGrammar: true,
    piperVoice: '',
}
class JsonStore {
    constructor(fn) {
        this.filepath = path.join(app.getPath('userData'), fn)
        this._data = this._load()
    }
    _load() { try { return JSON.parse(fs.readFileSync(this.filepath, 'utf8')) } catch { return {} } }
    _save() { fs.mkdirSync(path.dirname(this.filepath), { recursive: true }); fs.writeFileSync(this.filepath, JSON.stringify(this._data, null, 2)) }
    get(k) { return k in this._data ? this._data[k] : DEFAULTS[k] }
    set(k, v) { this._data[k] = v; this._save() }
    getAll() { return { ...DEFAULTS, ...this._data } }
}
class HistoryStore {
    constructor() {
        this.filepath = path.join(app.getPath('userData'), 'history.json')
        this._items = this._load()
    }
    _load() { try { return JSON.parse(fs.readFileSync(this.filepath, 'utf8')) } catch { return [] } }
    _save() { fs.mkdirSync(path.dirname(this.filepath), { recursive: true }); fs.writeFileSync(this.filepath, JSON.stringify(this._items, null, 2)) }
    add(text) {
        this._items.unshift({ id: Date.now().toString(), text, timestamp: new Date().toISOString() })
        if (this._items.length > 20) this._items = this._items.slice(0, 20)
        this._save()
    }
    getAll() { return [...this._items] }
    clear() { this._items = []; this._save() }
}

// ================================================================
// SINGLE INSTANCE GUARD
// ================================================================
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0) }

// NOTE: We intentionally show the dock icon so the app is easy to find.
// The dock icon click shows/focuses the control strip window.

// ================================================================
// STATE
// ================================================================
const state = {
    dictating: false,
    processing: false,
    reading: false,
    modelReady: false,
    modelProgress: 0,
}
let settings, history, tray
let controlStripWin = null
let settingsWin = null
let historyWin = null
let audioWin = null

// ================================================================
// HELPERS
// ================================================================
const isDev = !app.isPackaged

function getPreload() {
    return path.join(__dirname, '../preload/index.js')
}
function load(win, windowName) {
    if (process.env['ELECTRON_RENDERER_URL']) {
        win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/index.html?window=${windowName}`)
    } else if (isDev && process.env['VITE_DEV_SERVER_URL']) {
        win.loadURL(`${process.env['VITE_DEV_SERVER_URL']}/index.html?window=${windowName}`)
    } else {
        win.loadFile(path.join(__dirname, '../renderer/index.html'), { query: { window: windowName } })
    }
}
function broadcast(channel, data) {
    BrowserWindow.getAllWindows().forEach(w => {
        if (!w.isDestroyed() && w !== audioWin) w.webContents.send(channel, data)
    })
}
function syncUI() { broadcast('status-change', { ...state }) }

// ================================================================
// TEXT INJECTION (cross-platform clipboard + paste)
// ================================================================

// Continuously track the last non-Electron frontmost app.
// This solves the pill mode problem: clicking the pill makes Electron frontmost,
// so we can't capture the target app at click time. Instead we always know
// which app was last in front thanks to polling.
let targetBundleId = null
let lastNonElectronBundleId = null
let appTrackingInterval = null

function startAppTracking() {
    if (process.platform !== 'darwin' && process.platform !== 'win32') return
    // Poll every 1s for the frontmost app
    appTrackingInterval = setInterval(() => {
        try {
            if (process.platform === 'darwin') {
                const bid = execSync(
                    `osascript -e 'tell application "System Events" to get bundle identifier of first application process whose frontmost is true'`,
                    { encoding: 'utf8', timeout: 2000 }
                ).trim()
                if (bid && !bid.toLowerCase().includes('electron')) {
                    lastNonElectronBundleId = bid
                }
            } else if (process.platform === 'win32') {
                // Get the process name of the foreground window
                const name = execSync(
                    `powershell -NoProfile -Command "$sig='[DllImport(\\\"user32.dll\\\")]public static extern IntPtr GetForegroundWindow();[DllImport(\\\"user32.dll\\\")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);';if(-not('FGW' -as [type])){Add-Type -MemberDefinition $sig -Name FGW -Namespace VA};$h=[VA.FGW]::GetForegroundWindow();$p=0;[VA.FGW]::GetWindowThreadProcessId($h,[ref]$p)|Out-Null;(Get-Process -Id $p).ProcessName"`,
                    { encoding: 'utf8', timeout: 2000 }
                ).trim()
                if (name && !name.toLowerCase().includes('electron')) {
                    lastNonElectronBundleId = name
                }
            }
        } catch { /* ignore failures */ }
    }, 1000)
}

function stopAppTracking() {
    if (appTrackingInterval) { clearInterval(appTrackingInterval); appTrackingInterval = null }
}

function captureTargetApp() {
    // Use the continuously-tracked value (solves pill mode focus-stealing)
    if (lastNonElectronBundleId) {
        targetBundleId = lastNonElectronBundleId
        console.log('[VA] Target app (tracked):', targetBundleId)
        return
    }
    // Fallback: try live capture (works for hotkey-triggered actions on Mac)
    if (process.platform === 'darwin') {
        try {
            const bid = execSync(
                `osascript -e 'tell application "System Events" to get bundle identifier of first application process whose frontmost is true'`,
                { encoding: 'utf8', timeout: 2000 }
            ).trim()
            if (bid && !bid.toLowerCase().includes('electron')) {
                targetBundleId = bid
                console.log('[VA] Target app (live):', bid)
            }
        } catch { }
    }
}

async function activateTargetApp() {
    if (!targetBundleId) return
    try {
        if (process.platform === 'darwin') {
            execSync(`osascript -e 'tell application id "${targetBundleId}" to activate'`)
        } else if (process.platform === 'win32') {
            // On Windows, targetBundleId is the process name -- bring its window to front
            execSync(
                `powershell -NoProfile -Command "$p=Get-Process '${targetBundleId}' -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowHandle -ne 0} | Select-Object -First 1; if($p){if(-not('SFW' -as [type])){Add-Type -MemberDefinition '[DllImport(\\\"user32.dll\\\")]public static extern bool SetForegroundWindow(IntPtr h);' -Name SFW -Namespace VA};[VA.SFW]::SetForegroundWindow($p.MainWindowHandle)}"`,
                { timeout: 2000 }
            )
        }
        await sleep(150)
    } catch (err) {
        console.warn('[VA] Could not activate target app:', err.message)
    }
}

async function injectText(text) {
    const prev = clipboard.readText()
    clipboard.writeText(text + ' ')

    await activateTargetApp()

    try {
        if (process.platform === 'darwin') {
            execSync(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`)
        } else if (process.platform === 'win32') {
            execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`)
        }
    } catch (err) {
        console.error('[VA] Text injection failed:', err.message)
    }

    await sleep(400)
    clipboard.writeText(prev)
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ================================================================
// WINDOW CREATORS
// ================================================================
function showControlStrip() {
    if (controlStripWin && !controlStripWin.isDestroyed()) { controlStripWin.show(); return }
    controlStripWin = new BrowserWindow({
        width: 310, height: 396, frame: false,
        transparent: true,
        backgroundColor: '#00000000', // Fully transparent -- no compositor tint
        roundedCorners: true,
        alwaysOnTop: 'screen-saver', // Higher level to stay visible over full-screen apps
        skipTaskbar: true, // TRUE: keep it out of the Cmd+Tab and Dock as much as possible
        resizable: false,
        movable: true,
        type: 'panel', // OS-specific: floating panel that doesn't steal focus as easily
        focusable: false, // CRITICAL: prevent focus-stealing on click
        acceptFirstMouse: true, // receive click even when not focused
        hasShadow: false,
        show: true,
        webPreferences: { preload: getPreload(), contextIsolation: true, nodeIntegration: false }
    })
    const { width } = screen.getPrimaryDisplay().workAreaSize
    controlStripWin.setPosition(width - 360, 20)
    load(controlStripWin, 'control-strip')

    // macOS specific: Ensure the window stays on top correctly as a panel
    if (process.platform === 'darwin') {
        controlStripWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    }

    controlStripWin.on('closed', () => { controlStripWin = null })
}

function showSettings() {
    if (settingsWin && !settingsWin.isDestroyed()) { settingsWin.focus(); return }
    settingsWin = new BrowserWindow({
        width: 700, height: 620, minWidth: 580, minHeight: 500,
        title: 'VoiceAssist — Settings', show: true,
        webPreferences: { preload: getPreload(), contextIsolation: true, nodeIntegration: false }
    })
    load(settingsWin, 'settings')
    settingsWin.on('closed', () => { settingsWin = null })
}

function showHistory() {
    if (historyWin && !historyWin.isDestroyed()) { historyWin.focus(); return }
    historyWin = new BrowserWindow({
        width: 520, height: 620, minWidth: 400, minHeight: 400,
        title: 'VoiceAssist — Dictation History', show: false,
        webPreferences: { preload: getPreload(), contextIsolation: true, nodeIntegration: false }
    })
    load(historyWin, 'history')
    historyWin.once('ready-to-show', () => historyWin.show())
    historyWin.on('closed', () => { historyWin = null })
}

function ensureAudioWindow() {
    if (audioWin && !audioWin.isDestroyed()) return
    audioWin = new BrowserWindow({
        show: false,
        skipTaskbar: true,
        focusable: false,
        webPreferences: { preload: getPreload(), contextIsolation: true, nodeIntegration: false }
    })
    audioWin.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[renderer console] ${message}`);
    });
    load(audioWin, 'audio-capture')
    audioWin.on('closed', () => { audioWin = null })
}

function sendAudioCommand(cmd) {
    if (audioWin && !audioWin.isDestroyed()) audioWin.webContents.send('audio-command', cmd)
}

// ================================================================
// TRAY
// ================================================================
function buildTray() {
    const label = state.dictating ? '🔴  Listening...'
        : state.processing ? '🟡  Processing...'
            : state.reading ? '🔵  Reading aloud...'
                : '⚫  VoiceAssist — Ready'

    return Menu.buildFromTemplate([
        { label, enabled: false },
        { type: 'separator' },
        { label: state.dictating ? 'Stop Dictating' : 'Start Dictating', click: toggleDictation },
        { label: state.reading ? 'Stop Reading' : 'Read Selection', click: toggleReading },
        { type: 'separator' },
        { label: 'Show Control Strip', click: showControlStrip },
        { label: 'Dictation History...', click: showHistory },
        { label: 'Settings...', click: showSettings },
        { type: 'separator' },
        { label: 'Quit VoiceAssist', click: () => app.quit() },
    ])
}
function setTrayIcon(key) {
    if (!tray) return
    tray.setImage(ICONS[key] || ICONS.off)
    const lbls = { off: ' VA', listening: ' REC', processing: ' ...', reading: ' TTS' }
    if (process.platform === 'darwin') tray.setTitle(lbls[key] || ' VA')
    tray.setContextMenu(buildTray())
}

// ================================================================
// DICTATION
// ================================================================
function toggleDictation() { state.dictating ? stopDictation() : startDictation() }

function startDictation() {
    captureTargetApp()
    ensureAudioWindow()
    // Give audio window a moment to load before sending command
    if (audioWin.webContents.isLoading()) {
        audioWin.webContents.once('did-finish-load', () => sendAudioCommand('start'))
    } else {
        sendAudioCommand('start')
    }
    state.dictating = true
    setTrayIcon('listening'); syncUI()
}

function stopDictation() {
    sendAudioCommand('stop')
    state.dictating = false; state.processing = true
    setTrayIcon('processing'); syncUI()
}

// ================================================================
// READING ALOUD (placeholder — Milestone 4)
// ================================================================
async function toggleReading() {
    if (state.reading) { stopReading(); return }

    captureTargetApp()

    // Brief pause to let fingers lift from hotkey modifiers
    await sleep(150)

    // Activate the user's app and copy their selected text
    await activateTargetApp()

    try {
        if (process.platform === 'darwin') {
            execSync(`osascript -e 'tell application "System Events" to keystroke "c" using command down'`)
        } else if (process.platform === 'win32') {
            execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^c')"`)
        }
    } catch (err) { }

    await sleep(200) // Wait for OS clipboard to sync

    const text = clipboard.readText().trim()
    if (text) startReading(text)
}
function startReading(text) {
    ensureAudioWindow()
    state.reading = true
    setTrayIcon('reading'); syncUI()

    // Send the reading payload to the renderer
    if (audioWin.webContents.isLoading()) {
        audioWin.webContents.once('did-finish-load', () => audioWin.webContents.send('start-reading', text))
    } else {
        audioWin.webContents.send('start-reading', text)
    }
}
function stopReading() {
    if (audioWin && !audioWin.isDestroyed()) audioWin.webContents.send('stop-reading')
    state.reading = false
    setTrayIcon('off'); syncUI()
}

// ================================================================
// BOOTSTRAP
// ================================================================
app.whenReady().then(() => {
    settings = new JsonStore('settings.json')
    history = new HistoryStore()

    // Show the dock icon so the user can easily find and focus the app
    if (process.platform === 'darwin') app.dock.show()

    // Request macOS Accessibility access for AppleScript UI scripting (Cmd+V)
    if (process.platform === 'darwin') {
        const isTrusted = systemPreferences.isTrustedAccessibilityClient(false)
        if (!isTrusted) {
            console.warn('[VA] Missing Accessibility permissions. Requesting prompt...')
            setTimeout(() => {
                systemPreferences.isTrustedAccessibilityClient(true)
            }, 1000)
        }
    }

    Object.assign(ICONS, {
        off: makeCircle(100, 100, 120),
        listening: makeCircle(74, 222, 128),
        processing: makeCircle(251, 146, 60),
        reading: makeCircle(96, 165, 250),
    });

    showControlStrip()

    tray = new Tray(ICONS.off)
    tray.setToolTip('VoiceAssist — click to open')
    if (process.platform === 'darwin') tray.setTitle(' 🎙️')
    tray.setContextMenu(buildTray())
    tray.on('click', () => showControlStrip())   // single click on tray shows strip
    tray.on('double-click', () => showSettings()) // double-click opens settings

    // Start audio window so model loads in background
    ensureAudioWindow()

    // Track frontmost non-Electron app so pill mode knows where to paste
    startAppTracking()

    registerHotkeys()
    setupIPC()

    // Force open Settings on launch so user can see the app and set their hotkey
    setTimeout(() => {
        app.focus({ steal: true })
        showSettings()
    }, 1000)
})

// Standard Mac behavior: Clicking the Dock icon brings the app to life
app.on('activate', () => {
    if (settingsWin && !settingsWin.isDestroyed()) {
        settingsWin.show()
        settingsWin.focus()
    } else {
        showControlStrip()
    }
})

app.on('will-quit', () => { stopAppTracking(); globalShortcut.unregisterAll() })
app.on('window-all-closed', e => e.preventDefault())

// ================================================================
// HOTKEYS
// ================================================================
function registerHotkeys() {
    const pairs = [
        [settings.get('dictationHotkey'), toggleDictation],
        [settings.get('readHotkey'), toggleReading],
    ]
    for (const [key, fn] of pairs) {
        const ok = globalShortcut.register(key, fn)
        console.log(`[VA] Hotkey "${key}": ${ok ? 'registered ✓' : 'FAILED (conflict?)'}`)
    }
}

// ================================================================
// IPC
// ================================================================
function setupIPC() {
    // Settings
    ipcMain.handle('get-status', () => ({ ...state }))
    ipcMain.handle('get-settings', () => settings.getAll())
    ipcMain.handle('set-setting', (_, { key, value }) => {
        settings.set(key, value)
        // Broadcast change to all windows (except sender maybe, but broadcast is safe)
        broadcast('settings-changed', { key, value })
        // Special case: sync theme status to UI state
        if (key === 'theme') {
            state.theme = value
            syncUI()
        }
        return true
    })

    // Dictation
    ipcMain.handle('toggle-dictation', toggleDictation)

    // Reading aloud
    ipcMain.handle('toggle-reading', (_, text) => text ? startReading(text) : toggleReading())
    ipcMain.handle('stop-reading', stopReading)

    // History
    ipcMain.handle('get-history', () => history.getAll())
    ipcMain.handle('clear-history', () => { history.clear(); return true })
    ipcMain.handle('copy-to-clipboard', (_, text) => { clipboard.writeText(text); return true })

    // Windows
    ipcMain.handle('open-settings', showSettings)
    ipcMain.handle('open-history', showHistory)
    ipcMain.handle('re-register-hotkeys', () => {
        globalShortcut.unregisterAll()
        registerHotkeys()
        return true
    })
    ipcMain.handle('set-control-strip-mode', (_, mode) => {
        if (!controlStripWin || controlStripWin.isDestroyed()) return
        if (mode === 'mini') {
            controlStripWin.setSize(300, 48)
        } else {
            controlStripWin.setSize(310, 396)
        }
        return true
    })
    ipcMain.on('hide-window', e => {
        const w = BrowserWindow.fromWebContents(e.sender)
        if (w) w.hide()
    })
    ipcMain.on('quit-app', () => app.quit())

    // ── Audio window callbacks ──────────────────────────────────────
    ipcMain.handle('audio-status', (_, status) => {
        console.log('[VA audio]', JSON.stringify(status))
        switch (status.type) {
            case 'listening':
                state.dictating = true; state.processing = false
                setTrayIcon('listening'); syncUI(); break

            case 'processing':
            case 'waiting-for-model':
                state.dictating = false; state.processing = true
                setTrayIcon('processing'); syncUI(); break

            case 'model-loading':
                state.modelProgress = status.progress || 0
                if (!state.modelReady) {
                    state.dictating = false; state.processing = true
                    setTrayIcon('processing')
                    broadcast('status-change', { ...state, modelProgress: status.progress, modelFile: status.file })
                }
                break

            case 'model-ready':
                state.modelReady = true
                state.modelProgress = 100
                state.processing = false
                setTrayIcon('off'); syncUI()
                console.log('[VA] Whisper model ready ✓')
                break

            case 'idle':
                state.dictating = false; state.processing = false
                setTrayIcon('off'); syncUI(); break

            case 'error':
                console.error('[VA audio error]', status.message)
                state.dictating = false; state.processing = false
                setTrayIcon('off'); syncUI()
                broadcast('show-error', { message: status.message }); break
        }
    })

    ipcMain.handle('audio-transcript', async (_, text) => {
        try {
            console.log('[VA transcript]', text)
            history.add(text)
            broadcast('new-transcript', { text })
            await injectText(text)
        } catch (err) {
            console.error('[VA] Final transcript handling error:', err)
        } finally {
            state.processing = false
            setTrayIcon('off'); syncUI()
        }
    })

    // ── whisper.cpp sidecar ──────────────────────────────────────────
    ipcMain.handle('check-whisper', () => checkWhisperReady())

    ipcMain.handle('transcribe-audio', async (_, pcmArray) => {
        try {
            const float32 = new Float32Array(pcmArray)
            const lang = (settings.get('language') || 'en').split('-')[0]
            const rawText = await transcribe(float32, lang)

            if (rawText) {
                // Run the full text polish pipeline
                const cleaned = polishText(rawText, {
                    locale: settings.get('spellingLocale') || 'uk',
                    fixSpelling: settings.get('fixSpelling') !== false,
                    fixGrammar: settings.get('fixGrammar') !== false,
                    removeFillerWords: settings.get('removeFillerWords') !== false,
                })

                console.log('[VA] Raw:', rawText)
                console.log('[VA] Polished:', cleaned)

                if (cleaned) {
                    history.add(cleaned)
                    broadcast('new-transcript', { text: cleaned })
                    await injectText(cleaned)
                }

                state.processing = false
                setTrayIcon('off'); syncUI()
                return cleaned
            }

            state.processing = false
            setTrayIcon('off'); syncUI()
            return ''
        } catch (err) {
            console.error('[VA] Transcription error:', err)
            state.processing = false
            setTrayIcon('off'); syncUI()
            broadcast('show-error', { message: err.message })
            throw err
        }
    })

    // ── Piper TTS sidecar ────────────────────────────────────────────
    ipcMain.handle('check-piper', () => checkPiperReady())
    ipcMain.handle('list-piper-voices', () => listVoices())

    ipcMain.handle('piper-speak', async (_, { text, voice, speed }) => {
        try {
            const wavBuffer = await synthesise(text, {
                voice: voice || settings.get('piperVoice') || undefined,
                speed: speed || settings.get('readingSpeed') || 1.0,
            })
            // Return as array so it can be sent over IPC
            return { wav: Array.from(new Uint8Array(wavBuffer)) }
        } catch (err) {
            console.error('[VA] Piper TTS error:', err)
            throw err
        }
    })
}
