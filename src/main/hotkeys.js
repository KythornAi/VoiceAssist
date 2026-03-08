const { globalShortcut } = require('electron')
const { store } = require('./store')

let registered = []

function registerHotkeys(callbacks) {
    unregisterHotkeys()

    const pairs = [
        [store.get('dictationHotkey'), callbacks.onDictationToggle],
        [store.get('readHotkey'), callbacks.onReadSelection],
    ]

    for (const [hotkey, fn] of pairs) {
        const ok = globalShortcut.register(hotkey, fn)
        if (ok) {
            registered.push(hotkey)
            console.log(`[hotkeys] Registered: ${hotkey}`)
        } else {
            console.warn(`[hotkeys] Could not register: ${hotkey} (may be taken by another app)`)
        }
    }
}

function unregisterHotkeys() {
    registered.forEach(h => { try { globalShortcut.unregister(h) } catch { } })
    registered = []
}

module.exports = { registerHotkeys, unregisterHotkeys }
