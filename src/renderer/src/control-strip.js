export function renderControlStrip() {
  const style = document.createElement('style')
  style.textContent = `
    html, body {
      background: transparent !important;
      overflow: hidden;
      margin: 0; padding: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: var(--text);
    }

    #strip {
      display: flex; flex-direction: column;
      width: 100%; height: 100%;
      background: var(--bg-elevated);
      border: 1px solid var(--border);
      border-radius: 20px;
      overflow: hidden;
      -webkit-app-region: drag;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #strip button, #strip a { -webkit-app-region: no-drag; }

    /* ── Header ──────────────────────────────── */
    .strip-header {
      display: flex; align-items: center; gap: 10px;
      padding: 16px 16px 12px;
      border-bottom: 1px solid var(--border);
    }
    .strip-header .logo-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .strip-header .logo-icon svg { width: 16px; height: 16px; color: white; }
    .strip-header .app-name { font-size: 14px; font-weight: 600; color: var(--text); }
    .strip-header .app-status {
      font-size: 10px; font-weight: 600; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.06em;
      margin-top: 1px;
    }
    .header-actions {
      margin-left: auto;
      display: flex; align-items: center; gap: 4px;
    }
    .header-btn {
      width: 24px; height: 24px; padding: 0;
      background: none; border: none;
      color: var(--text-muted); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      border-radius: 4px;
      -webkit-app-region: no-drag;
    }
    .header-btn:hover { background: var(--surface); color: var(--text); }
    .header-btn svg { width: 14px; height: 14px; }

    /* ── Menu Items ───────────────────────────── */
    .menu-group { padding: 6px 8px; }
    .menu-item {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      background: none; border: none;
      color: var(--text-secondary); font-size: 13px; font-weight: 500;
      cursor: pointer; width: 100%;
      font-family: inherit;
      transition: background 0.1s ease;
      -webkit-app-region: no-drag;
      text-align: left;
    }
    .menu-item:hover { background: var(--surface); color: var(--text); }
    .menu-item:active { background: var(--surface-2); }
    .menu-item.active { background: var(--accent-soft); color: var(--accent); }

    .menu-item .icon {
      width: 20px; height: 20px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      color: var(--text-muted);
    }
    .menu-item.active .icon { color: var(--accent); }
    .menu-item .icon svg { width: 16px; height: 16px; }
    .menu-item .label { flex: 1; }
    .menu-item .shortcut {
      font-size: 11px; color: var(--text-muted);
      font-weight: 500; letter-spacing: 0.02em;
    }

    /* Appearance toggle row */
    .appearance-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
    }
    .appearance-row .icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); }
    .appearance-row .icon svg { width: 16px; height: 16px; }
    .appearance-row .label { flex: 1; font-size: 13px; font-weight: 500; color: var(--text-secondary); }

    /* macOS-style toggle pill */
    .theme-toggle {
      width: 44px; height: 22px;
      border-radius: 11px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      cursor: pointer;
      position: relative;
      transition: background 0.2s;
      -webkit-app-region: no-drag;
    }
    .theme-toggle .thumb {
      position: absolute; top: 2px; left: 2px;
      width: 16px; height: 16px;
      border-radius: 50%; background: #fff;
      transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
    }
    .theme-toggle .thumb svg { width: 10px; height: 10px; }
    .theme-toggle.light { background: var(--accent); border-color: var(--accent); }
    .theme-toggle.light .thumb { transform: translateX(22px); }

    .divider {
      height: 1px; background: var(--border);
      margin: 2px 14px;
    }

    /* ── Waveform ─────────────────────────────── */
    .waveform {
      display: flex; justify-content: center; align-items: flex-end;
      gap: 3px;
      padding: 6px 0 10px;
      height: 28px;
    }
    .waveform .bar {
      width: 3px; border-radius: 1.5px;
      background: #2563EB;
      opacity: 0.6;
      transition: height 0.12s ease;
    }
    .waveform.active .bar { opacity: 1; }

    /* ── Mini Mode ────────────────────────────── */
    #strip.mini-mode {
      flex-direction: row;
      align-items: center;
      padding: 0 4px;
      border-radius: 24px;
      height: 48px;
      width: 100%;
      background: #111; /* Very dark, but solid */
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 4px 20px rgba(0,0,0,0.6);
    }
    .mini-mode .strip-header, 
    .mini-mode .menu-group, 
    .mini-mode .divider,
    .mini-mode .waveform { display: none !important; }

    /* Mini specific controls */
    .mini-controls {
      display: none;
      align-items: center;
      justify-content: space-around; /* Better distribution */
      width: 100%;
      height: 100%;
      padding: 0 6px;
      -webkit-app-region: drag;
    }
    #strip.mini-mode .mini-controls { display: flex; }

    .mini-btn {
      width: 40px; height: 40px;
      border-radius: 20px;
      background: transparent; border: none;
      color: #FFFFFF !important; /* ABSOLUTE WHITE */
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      -webkit-app-region: no-drag;
      opacity: 0.95;
      padding: 0; margin: 0;
    }
    .mini-btn:hover { 
      background: rgba(255,255,255,0.12); 
      transform: scale(1.1);
      box-shadow: 0 0 10px rgba(255,255,255,0.2);
    }
    .mini-btn:active { transform: scale(0.9); }
    button, .theme-toggle { touch-action: none; }
    /* Mini btn states */
    .mini-btn.dictating.active { color: #22C55E !important; background: rgba(34, 197, 94, 0.15); opacity: 1; }
    .mini-btn.reading.active { color: #3B82F6 !important; background: rgba(59, 130, 246, 0.15); opacity: 1; }
    
    .mini-btn svg { 
      width: 20px; height: 20px; 
      stroke: white !important;
      stroke-width: 2.5px !important;
    }
    .mini-btn.dictating.active svg { stroke: #22C55E !important; }
    .mini-btn.reading.active svg { stroke: #3B82F6 !important; }

    .mini-drag {
      flex: 1; height: 100%;
      display: flex; align-items: center; justify-content: center;
      color: #FFFFFF; opacity: 0.15;
      cursor: grab;
    }
    .mini-drag svg { width: 14px; height: 14px; stroke: white; }

    /* Mini Waveform */
    .mini-waveform {
      display: none; align-items: center; gap: 2px;
      height: 16px; margin: 0 4px;
    }
    #strip.mini-mode .mini-waveform.active { display: flex; }
    .mini-waveform .bar {
      width: 2px; height: 4px; background: #22C55E; border-radius: 1px;
      transition: height 0.1s;
    }
  `
  document.head.appendChild(style)

  // SVG Icons — clean, minimal, Apple-style
  const icons = {
    mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="1" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="21" x2="12" y2="17"/></svg>`,
    speaker: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    waveform: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="8" width="2" height="8" rx="1"/><rect x="7" y="5" width="2" height="14" rx="1"/><rect x="11" y="3" width="2" height="18" rx="1"/><rect x="15" y="6" width="2" height="12" rx="1"/><rect x="19" y="9" width="2" height="6" rx="1"/></svg>`,
    moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    collapse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
    expand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
    drag: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>`,
    stop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
  }

  document.body.innerHTML = `
    <div id="strip">
      <!-- Full Mode Header -->
      <div class="strip-header">
        <div class="logo-icon">${icons.waveform}</div>
        <div>
          <div class="app-name">VoiceAssist</div>
          <div class="app-status" id="app-status">READY TO LISTEN</div>
        </div>
        <div class="header-actions">
          <button class="header-btn" id="btn-collapse" title="Mini Mode">${icons.collapse}</button>
          <button class="header-btn" id="btn-close" title="Hide">${icons.close}</button>
        </div>
      </div>

      <!-- Full Mode Menu -->
      <div class="menu-group">
        <button class="menu-item" id="btn-dictate">
          <span class="icon">${icons.mic}</span>
          <span class="label">Dictate</span>
          <span class="shortcut" id="dk">⌘ D</span>
        </button>
        <button class="menu-item" id="btn-read">
          <span class="icon">${icons.speaker}</span>
          <span class="label">Read Selection</span>
          <span class="shortcut" id="rk">⌘ ⌥ R</span>
        </button>
      </div>

      <div class="divider"></div>

      <div class="menu-group">
        <button class="menu-item" id="btn-history">
          <span class="icon">${icons.clock}</span>
          <span class="label">Dictation History…</span>
        </button>
        <button class="menu-item" id="btn-settings">
          <span class="icon">${icons.settings}</span>
          <span class="label">Settings…</span>
        </button>
      </div>

      <div class="divider"></div>

      <div class="menu-group">
        <button class="menu-item" id="btn-about">
          <span class="icon">${icons.info}</span>
          <span class="label">About VoiceAssist</span>
        </button>

        <div class="appearance-row">
          <span class="icon">${icons.moon}</span>
          <span class="label">Appearance</span>
          <button class="theme-toggle" id="theme-toggle">
            <div class="thumb"></div>
          </button>
        </div>

        <button class="menu-item" id="btn-quit">
          <span class="icon">${icons.logout}</span>
          <span class="label">Quit VoiceAssist</span>
        </button>
      </div>

      <div class="waveform" id="waveform">
        <div class="bar" style="height:4px"></div>
        <div class="bar" style="height:7px"></div>
        <div class="bar" style="height:12px"></div>
        <div class="bar" style="height:8px"></div>
        <div class="bar" style="height:14px"></div>
        <div class="bar" style="height:6px"></div>
        <div class="bar" style="height:10px"></div>
      </div>

      <!-- Mini Mode Controls -->
      <div class="mini-controls">
        <button class="mini-btn dictating" id="mini-btn-dictate" title="Dictate">${icons.mic}</button>
        <div class="mini-waveform" id="mini-waveform">
          <div class="bar"></div>
          <div class="bar"></div>
          <div class="bar"></div>
        </div>
        <button class="mini-btn reading" id="mini-btn-read" title="Read Selection">${icons.speaker}</button>
        <div class="mini-drag">${icons.drag}</div>
        <button class="mini-btn" id="mini-btn-expand" title="Expand">${icons.expand}</button>
      </div>
    </div>
  `

  // ── Elements ──
  const strip = document.getElementById('strip')
  const appStatus = document.getElementById('app-status')
  const waveform = document.getElementById('waveform')
  const bars = document.querySelectorAll('.waveform .bar')
  const themeToggle = document.getElementById('theme-toggle')

  const miniWaveform = document.getElementById('mini-waveform')
  const miniBars = document.querySelectorAll('.mini-waveform .bar')

  // ── Waveform animation ──
  let waveInterval = null
  function startWave() {
    waveform.classList.add('active')
    miniWaveform.classList.add('active')
    waveInterval = setInterval(() => {
      bars.forEach(b => { b.style.height = (3 + Math.random() * 14) + 'px' })
      miniBars.forEach(b => { b.style.height = (4 + Math.random() * 12) + 'px' })
    }, 140)
  }
  function stopWave() {
    if (waveInterval) { clearInterval(waveInterval); waveInterval = null }
    waveform.classList.remove('active')
    miniWaveform.classList.remove('active')
      ;[4, 7, 12, 8, 14, 6, 10].forEach((h, i) => { bars[i].style.height = h + 'px' })
    miniBars.forEach(b => { b.style.height = '4px' })
  }

  // ── Mode Toggle ──
  async function toggleMode(mode) {
    if (mode === 'mini') {
      strip.classList.add('mini-mode')
      await window.api.setControlStripMode('mini')
    } else {
      strip.classList.remove('mini-mode')
      await window.api.setControlStripMode('full')
    }
  }

  document.getElementById('btn-collapse').addEventListener('pointerdown', () => toggleMode('mini'))
  document.getElementById('mini-btn-expand').addEventListener('pointerdown', () => toggleMode('full'))

  // ── Theme toggle ──
  let isDark = true
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    isDark = (theme !== 'light')
    themeToggle.classList.toggle('light', !isDark)
  }

  themeToggle.addEventListener('pointerdown', () => {
    isDark = !isDark
    const newTheme = isDark ? 'dark' : 'light'
    applyTheme(newTheme)
    window.api.setSetting('theme', newTheme)
  })

  // ── Hotkey display ──
  window.api.getSettings().then(s => {
    const fmt = k => (k || '').replace('CommandOrControl', '⌘').replace('Command', '⌘').replace('Shift', '⇧').replace('Control', '⌃').replace('Alt', '⌥').replace(/\+/g, ' ')
    if (s.dictationHotkey) document.getElementById('dk').textContent = fmt(s.dictationHotkey)
    if (s.readHotkey) document.getElementById('rk').textContent = fmt(s.readHotkey)
    if (s.theme === 'light') { isDark = false; applyTheme('light') }
  })

  // ── Status updates ──
  function applyStatus(s) {
    const { dictating, processing, reading, modelProgress, theme } = s

    if (theme) applyTheme(theme)

    const dictateBtns = [document.getElementById('btn-dictate'), document.getElementById('mini-btn-dictate')]
    const readBtns = [document.getElementById('btn-read'), document.getElementById('mini-btn-read')]
    const miniMic = document.getElementById('mini-btn-dictate')
    const miniRead = document.getElementById('mini-btn-read')

    // RESET STATES
    dictateBtns.forEach(b => b.classList.remove('active'))
    readBtns.forEach(b => b.classList.remove('active'))
    miniMic.style.opacity = '1'
    miniRead.style.opacity = '1'
    miniMic.innerHTML = icons.mic
    document.querySelector('#btn-dictate .label').textContent = 'Dictate'
    document.querySelector('#btn-read .label').textContent = 'Read Selection'

    // 1. ACTIVE STATES (Always take priority)
    if (dictating) {
      appStatus.textContent = 'LISTENING…'
      dictateBtns.forEach(b => b.classList.add('active'))
      miniMic.innerHTML = icons.stop
      document.querySelector('#btn-dictate .label').textContent = 'Stop Dictating'
      startWave()
      return
    }

    if (reading) {
      appStatus.textContent = 'READING ALOUD'
      readBtns.forEach(b => b.classList.add('active'))
      document.querySelector('#btn-read .label').textContent = 'Stop Reading'
      startWave()
      return
    }

    // 2. BACKGROUND PROCESSING / LOADING
    if (processing) {
      stopWave()
      if (modelProgress !== undefined && modelProgress < 100) {
        appStatus.textContent = `DOWNLOADING — ${modelProgress}%`
        miniMic.style.opacity = '0.5'
      } else {
        appStatus.textContent = 'PROCESSING…'
        miniMic.style.opacity = '0.5'
        document.querySelector('#btn-dictate .label').textContent = 'Processing...'
      }
      return
    }

    // 3. IDLE
    appStatus.textContent = 'READY TO LISTEN'
    stopWave()
  }

  window.api.getStatus().then(applyStatus)
  window.api.onStatusChange(applyStatus)

  // ── Button handlers ──
  const dictateAction = () => window.api.toggleDictation()
  const readAction = () => window.api.toggleReading()

  document.getElementById('btn-dictate').addEventListener('pointerdown', dictateAction)
  document.getElementById('mini-btn-dictate').addEventListener('pointerdown', dictateAction)
  document.getElementById('btn-read').addEventListener('pointerdown', readAction)
  document.getElementById('mini-btn-read').addEventListener('pointerdown', readAction)

  document.getElementById('btn-history').addEventListener('pointerdown', () => window.api.openHistory())
  document.getElementById('btn-settings').addEventListener('pointerdown', () => window.api.openSettings())
  document.getElementById('btn-quit').addEventListener('pointerdown', () => window.api.quitApp())
  document.getElementById('btn-close').addEventListener('pointerdown', () => window.api.hideWindow())
}
