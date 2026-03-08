import './src/style.css'
import { renderControlStrip } from './src/control-strip.js'
import { renderSettings } from './src/settings.js'
import { renderHistory } from './src/history.js'
import { renderAudioCapture } from './src/audio-capture.js'

const params = new URLSearchParams(window.location.search)
const view = params.get('window') || 'control-strip'

if (view === 'settings') renderSettings()
else if (view === 'history') renderHistory()
else if (view === 'audio-capture') renderAudioCapture()
else renderControlStrip()
