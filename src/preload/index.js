const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
    // ── Status ─────────────────────────────────────────────────────
    getStatus: () => ipcRenderer.invoke('get-status'),

    // ── Settings ───────────────────────────────────────────────────
    getSettings: () => ipcRenderer.invoke('get-settings'),
    setSetting: (key, value) => ipcRenderer.invoke('set-setting', { key, value }),

    // ── Dictation (UI-triggered) ───────────────────────────────────
    toggleDictation: () => ipcRenderer.invoke('toggle-dictation'),

    // ── History ────────────────────────────────────────────────────
    getHistory: () => ipcRenderer.invoke('get-history'),
    clearHistory: () => ipcRenderer.invoke('clear-history'),
    copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),

    // ── Reading aloud ──────────────────────────────────────────────
    toggleReading: (text) => ipcRenderer.invoke('toggle-reading', text),
    stopReading: () => ipcRenderer.invoke('stop-reading'),

    // ── Window actions ─────────────────────────────────────────────
    openSettings: () => ipcRenderer.invoke('open-settings'),
    openHistory: () => ipcRenderer.invoke('open-history'),
    reRegisterHotkeys: () => ipcRenderer.invoke('re-register-hotkeys'),
    setControlStripMode: (mode) => ipcRenderer.invoke('set-control-strip-mode', mode),
    hideWindow: () => ipcRenderer.send('hide-window'),
    quitApp: () => ipcRenderer.send('quit-app'),

    // ── Audio capture (used by hidden audio-capture window) ────────
    onAudioCommand: (cb) => {
        const h = (_, cmd) => cb(cmd)
        ipcRenderer.on('audio-command', h)
        return () => ipcRenderer.removeListener('audio-command', h)
    },
    onReadCommand: (cb) => {
        const h = (_, text) => cb(text)
        ipcRenderer.on('start-reading', h)
        return () => ipcRenderer.removeListener('start-reading', h)
    },
    onStopReading: (cb) => {
        const h = () => cb()
        ipcRenderer.on('stop-reading', h)
        return () => ipcRenderer.removeListener('stop-reading', h)
    },
    sendAudioStatus: (status) => ipcRenderer.invoke('audio-status', status),
    sendTranscript: (text) => ipcRenderer.invoke('audio-transcript', text),

    // ── Events pushed from main → all renderers ────────────────────
    onStatusChange: (cb) => {
        const h = (_, data) => cb(data)
        ipcRenderer.on('status-change', h)
        return () => ipcRenderer.removeListener('status-change', h)
    },
})
