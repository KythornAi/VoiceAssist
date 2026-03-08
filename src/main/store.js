const { app } = require('electron')
const path = require('path')
const fs = require('fs')

const DEFAULTS = {
    dictationHotkey: process.platform === 'darwin' ? 'Command+Shift+Space' : 'Control+Shift+Space',
    readHotkey: process.platform === 'darwin' ? 'Command+Alt+R' : 'Control+Alt+R',
    autoPunctuation: true,
    microphone: 'default',
    language: 'en-US',
    voice: 'en-US-AriaNeural',
    readingSpeed: 1.0,
    showControlStrip: true,
    launchAtStartup: false,
    maxHistoryItems: 20,
    theme: 'dark',
}

class JsonStore {
    constructor(filename) {
        this.filepath = path.join(app.getPath('userData'), filename)
        this._data = this._load()
    }

    _load() {
        try { return JSON.parse(fs.readFileSync(this.filepath, 'utf8')) } catch { return {} }
    }

    _save() {
        fs.mkdirSync(path.dirname(this.filepath), { recursive: true })
        fs.writeFileSync(this.filepath, JSON.stringify(this._data, null, 2), 'utf8')
    }

    get(key) { return key in this._data ? this._data[key] : DEFAULTS[key] }
    set(key, value) { this._data[key] = value; this._save() }
    getAll() { return { ...DEFAULTS, ...this._data } }
}

class HistoryStore {
    constructor() {
        this.filepath = path.join(app.getPath('userData'), 'history.json')
        this._items = this._load()
    }

    _load() {
        try { return JSON.parse(fs.readFileSync(this.filepath, 'utf8')) } catch { return [] }
    }

    _save() {
        fs.mkdirSync(path.dirname(this.filepath), { recursive: true })
        fs.writeFileSync(this.filepath, JSON.stringify(this._items, null, 2), 'utf8')
    }

    add(text) {
        this._items.unshift({ id: Date.now().toString(), text, timestamp: new Date().toISOString() })
        if (this._items.length > 20) this._items = this._items.slice(0, 20)
        this._save()
        return this._items[0]
    }

    getAll() { return [...this._items] }
    clear() { this._items = []; this._save() }
}

const store = new JsonStore('settings.json')
const history = new HistoryStore()

module.exports = { store, history }
