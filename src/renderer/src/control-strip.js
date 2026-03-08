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

    /* ── Expanded Panel ────────────────────────── */
    #strip {
      display: flex; flex-direction: column;
      width: 100%; height: 100%;
      background: #111920;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      overflow: hidden;
      -webkit-app-region: drag;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
    }
    #strip button, #strip a { -webkit-app-region: no-drag; }

    /* ── Header ──────────────────────────────── */
    .strip-header {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      background: rgba(255, 255, 255, 0.03);
    }
    .strip-header .logo-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: rgba(43, 140, 238, 0.2);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .strip-header .logo-icon svg { width: 16px; height: 16px; color: #2b8cee; }
    .strip-header .app-name { font-size: 14px; font-weight: 600; color: var(--text); }
    .strip-header .app-status {
      font-size: 10px; font-weight: 700; color: var(--text-muted);
      text-transform: uppercase; letter-spacing: 0.08em;
      margin-top: 1px;
    }
    .header-actions {
      margin-left: auto;
      display: flex; align-items: center; gap: 4px;
    }
    .header-btn {
      width: 28px; height: 28px; padding: 0;
      background: none; border: none;
      color: var(--text-muted); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px;
      -webkit-app-region: no-drag;
      transition: all 0.15s;
    }
    .header-btn:hover { background: rgba(255, 255, 255, 0.08); color: var(--text); }
    .header-btn svg { width: 14px; height: 14px; }

    /* ── Menu Items ───────────────────────────── */
    .menu-group { padding: 4px 6px; }
    .menu-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 10px;
      border-radius: 8px;
      background: none; border: none;
      color: var(--text-secondary); font-size: 13px; font-weight: 500;
      cursor: pointer; width: 100%;
      font-family: inherit;
      transition: all 0.15s;
      -webkit-app-region: no-drag;
      text-align: left;
    }
    .menu-item:hover { background: #2b8cee; color: #fff; }
    .menu-item:active { background: #2577d4; }
    .menu-item.active { background: rgba(43, 140, 238, 0.15); color: #2b8cee; }

    .menu-item .lhs {
      display: flex; align-items: center; gap: 10px;
    }
    .menu-item .icon {
      width: 20px; height: 20px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .menu-item.active .icon { color: #2b8cee; }
    .menu-item .icon svg { width: 16px; height: 16px; }
    .menu-item .label { flex: 1; }
    .menu-item .shortcut {
      font-size: 11px; color: var(--text-muted);
      font-weight: 500; letter-spacing: 0.02em;
      opacity: 0.5;
      display: flex; align-items: center; gap: 2px;
    }
    .menu-item:hover .shortcut { opacity: 1; color: rgba(255,255,255,0.8); }

    /* ── Appearance toggle (sun/moon inline) ── */
    .appearance-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 10px;
      border-radius: 8px;
      transition: all 0.15s;
    }
    .appearance-row:hover { background: rgba(255, 255, 255, 0.04); }
    .appearance-row .lhs {
      display: flex; align-items: center; gap: 10px;
    }
    .appearance-row .icon { width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: var(--text-muted); }
    .appearance-row .icon svg { width: 16px; height: 16px; }
    .appearance-row .label { font-size: 13px; font-weight: 500; color: var(--text-secondary); }

    /* Sun/Moon pill toggle */
    .theme-pill {
      display: flex; align-items: center; gap: 2px;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px;
      border-radius: 12px;
      border: none;
      cursor: pointer;
      -webkit-app-region: no-drag;
    }
    .theme-pill .theme-opt {
      width: 20px; height: 20px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
      background: transparent;
    }
    .theme-pill .theme-opt svg { width: 12px; height: 12px; }
    .theme-pill .theme-opt.active-light {
      background: #fff;
    }
    .theme-pill .theme-opt.active-light svg { color: #2b8cee; }
    .theme-pill .theme-opt.active-dark {
      background: #2b8cee;
    }
    .theme-pill .theme-opt.active-dark svg { color: #fff; }
    .theme-pill .theme-opt:not(.active-light):not(.active-dark) svg { color: var(--text-muted); }

    .divider {
      height: 1px; background: rgba(255, 255, 255, 0.06);
      margin: 3px 12px;
    }

    /* ── Waveform footer ─────────────────────── */
    .waveform-footer {
      display: flex; justify-content: center; align-items: flex-end;
      gap: 2px;
      padding: 8px 0 12px;
      height: 32px;
      background: rgba(255, 255, 255, 0.03);
      border-top: 1px solid rgba(255, 255, 255, 0.04);
    }
    .waveform-footer .bar {
      width: 3px; border-radius: 2px;
      transition: height 0.12s ease;
    }
    .waveform-footer.active .bar { opacity: 1; }

    /* ── Mini / Pill Mode ────────────────────── */
    #strip.mini-mode {
      flex-direction: row;
      align-items: center;
      padding: 0 10px;
      border-radius: 9999px;
      height: 56px;
      width: 100%;
      background: rgba(16, 25, 34, 0.9);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.8);
      position: relative;
    }
    .mini-mode .strip-header,
    .mini-mode .menu-group,
    .mini-mode .divider,
    .mini-mode .waveform-footer { display: none !important; }

    /* Mini controls */
    .mini-controls {
      display: none;
      align-items: center;
      width: 100%;
      height: 100%;
      padding: 0 2px;
      gap: 8px;
      -webkit-app-region: drag;
      justify-content: center;
    }
    #strip.mini-mode .mini-controls { display: flex; }

    /* All pill buttons base -- prevent Electron weirdness */
    .mini-controls button {
      -webkit-app-region: no-drag;
      border: none;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
    }

    /* Red mic button */
    .mini-mic-btn {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: #EF4444 !important;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .mini-mic-btn:hover { transform: scale(1.08); background: #DC2626 !important; }
    .mini-mic-btn:active { transform: scale(0.95); }
    .mini-mic-btn.recording { animation: mic-pulse 2s infinite; }
    @keyframes mic-pulse {
      0%   { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.6); }
      70%  { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }

    /* Mini waveform -- tall bars like mockup */
    .mini-waveform {
      display: flex; align-items: flex-end; gap: 2.5px;
      height: 32px; padding: 0 6px;
      flex-shrink: 0;
    }
    .mini-waveform .bar {
      width: 3px;
      border-radius: 2px;
      background: linear-gradient(to top, #2b8cee, #60a5fa);
      transition: height 0.12s ease;
    }

    /* Vertical separator */
    .mini-sep {
      width: 1px; height: 24px;
      background: rgba(255, 255, 255, 0.12);
      flex-shrink: 0;
    }

    /* Action buttons (read, etc) */
    .mini-action {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: transparent;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .mini-action:hover { background: rgba(255, 255, 255, 0.1); transform: scale(1.05); }
    .mini-action:active { transform: scale(0.9); }
    .mini-action.reading-active { background: rgba(43, 140, 238, 0.2); }
    .mini-action.reading-active svg { stroke: #2b8cee !important; }

    /* Done button */
    .mini-done-btn {
      display: none;
      align-items: center; gap: 8px;
      background: #2b8cee !important;
      color: #fff;
      border-radius: 9999px;
      padding: 12px 32px 12px 24px;
      font-size: 14px; font-weight: 600;
      font-family: inherit;
      letter-spacing: 0.02em;
      transition: all 0.15s;
      box-shadow: 0 4px 12px rgba(43, 140, 238, 0.3);
      white-space: nowrap;
    }
    .mini-done-btn span {
      color: #fff; font-size: 14px; font-weight: 600;
    }
    .mini-done-btn:hover { background: #2577d4 !important; }
    .mini-done-btn:active { transform: scale(0.95); }
    .mini-done-btn.visible { display: flex; }

    /* Expand button */
    .mini-expand {
      width: 28px; height: 28px;
      border-radius: 50%;
      background: transparent;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.15s;
    }
    .mini-expand:hover { background: rgba(255, 255, 255, 0.1); }

    /* Subtle glow under pill */
    #strip.mini-mode::after {
      content: '';
      position: absolute;
      inset: -4px;
      background: radial-gradient(ellipse at center, rgba(43, 140, 238, 0.1) 0%, transparent 70%);
      border-radius: 9999px;
      z-index: -1;
      pointer-events: none;
    }

    button, .theme-pill { touch-action: none; }
  `
  document.head.appendChild(style)

  // SVG Icons
  const icons = {
    mic: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="1" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="21" x2="12" y2="17"/></svg>`,
    speaker: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`,
    history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    waveform: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="8" width="2" height="8" rx="1"/><rect x="7" y="5" width="2" height="14" rx="1"/><rect x="11" y="3" width="2" height="18" rx="1"/><rect x="15" y="6" width="2" height="12" rx="1"/><rect x="19" y="9" width="2" height="6" rx="1"/></svg>`,
    moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
    collapse: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
    expand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>`,
    stop: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
    readAloud: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  }

  // Waveform bar colours (gradient from dim to bright)
  const waveColours = [
    'rgba(43,140,238,0.3)', 'rgba(43,140,238,0.4)', 'rgba(43,140,238,0.5)',
    'rgba(43,140,238,0.6)', 'rgba(43,140,238,0.8)', 'rgba(43,140,238,1)',
    'rgba(43,140,238,0.7)', 'rgba(43,140,238,0.5)', 'rgba(43,140,238,0.4)',
    'rgba(43,140,238,0.3)',
  ]

  document.body.innerHTML = `
    <div id="strip">
      <!-- ── Expanded Mode ───────────────────── -->
      <div class="strip-header">
        <div class="logo-icon">${icons.mic}</div>
        <div>
          <div class="app-name">VoiceAssist</div>
          <div class="app-status" id="app-status">READY TO LISTEN</div>
        </div>
        <div class="header-actions">
          <button class="header-btn" id="btn-collapse" title="Mini Mode">${icons.collapse}</button>
          <button class="header-btn" id="btn-close" title="Hide">${icons.close}</button>
        </div>
      </div>

      <div class="menu-group">
        <button class="menu-item" id="btn-dictate">
          <span class="lhs">
            <span class="icon">${icons.mic}</span>
            <span class="label" id="dictate-label">Dictate</span>
          </span>
          <span class="shortcut" id="dk">⌘ D</span>
        </button>
        <button class="menu-item" id="btn-read">
          <span class="lhs">
            <span class="icon">${icons.speaker}</span>
            <span class="label" id="read-label">Read Selection</span>
          </span>
          <span class="shortcut" id="rk">⌘ ⌥ R</span>
        </button>
      </div>

      <div class="divider"></div>

      <div class="menu-group">
        <button class="menu-item" id="btn-history">
          <span class="lhs">
            <span class="icon">${icons.history}</span>
            <span class="label">Dictation History...</span>
          </span>
        </button>
        <button class="menu-item" id="btn-settings">
          <span class="lhs">
            <span class="icon">${icons.settings}</span>
            <span class="label">Settings...</span>
          </span>
        </button>
      </div>

      <div class="divider"></div>

      <div class="menu-group">
        <button class="menu-item" id="btn-about">
          <span class="lhs">
            <span class="icon">${icons.info}</span>
            <span class="label">About VoiceAssist</span>
          </span>
        </button>

        <div class="appearance-row">
          <span class="lhs">
            <span class="icon">${icons.moon}</span>
            <span class="label">Appearance</span>
          </span>
          <div class="theme-pill" id="theme-toggle">
            <div class="theme-opt sun-opt" data-mode="light">${icons.sun}</div>
            <div class="theme-opt moon-opt active-dark" data-mode="dark">${icons.moon}</div>
          </div>
        </div>

        <button class="menu-item" id="btn-quit" style="margin-top: 2px;">
          <span class="lhs">
            <span class="icon">${icons.logout}</span>
            <span class="label">Quit VoiceAssist</span>
          </span>
          <span class="shortcut">⌘ Q</span>
        </button>
      </div>

      <!-- Waveform footer -->
      <div class="waveform-footer" id="waveform">
        ${waveColours.map((c, i) => `<div class="bar" style="height:${[3,5,2,4,6,3,5,2,4,1][i]}px; background:${c}"></div>`).join('')}
      </div>

      <!-- ── Mini / Pill Mode Controls ────── -->
      <div class="mini-controls">
        <button class="mini-mic-btn" id="mini-btn-dictate" title="Dictate">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="1" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="21" x2="12" y2="17"/></svg>
        </button>

        <div class="mini-waveform" id="mini-waveform">
          <div class="bar" style="height:12px"></div>
          <div class="bar" style="height:20px"></div>
          <div class="bar" style="height:28px"></div>
          <div class="bar" style="height:17px"></div>
          <div class="bar" style="height:25px"></div>
          <div class="bar" style="height:11px"></div>
          <div class="bar" style="height:22px"></div>
          <div class="bar" style="height:14px"></div>
          <div class="bar" style="height:19px"></div>
        </div>

        <div class="mini-sep"></div>

        <button class="mini-action" id="mini-btn-read" title="Read Selection">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="none"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
        </button>

        <button class="mini-done-btn" id="mini-done-btn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Done</span>
        </button>

        <button class="mini-expand" id="mini-btn-expand" title="Expand">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>
      </div>
    </div>
  `

  // ── Elements ──
  const strip = document.getElementById('strip')
  const appStatus = document.getElementById('app-status')
  const waveform = document.getElementById('waveform')
  const waveBars = waveform.querySelectorAll('.bar')

  const miniWaveform = document.getElementById('mini-waveform')
  const miniBars = miniWaveform.querySelectorAll('.bar')
  const miniMicBtn = document.getElementById('mini-btn-dictate')
  const miniDoneBtn = document.getElementById('mini-done-btn')
  const miniReadBtn = document.getElementById('mini-btn-read')

  // ── Waveform animation ──
  const miniDefaultH = [12, 20, 28, 17, 25, 11, 22, 14, 19]
  let waveInterval = null
  function startWave() {
    waveform.classList.add('active')
    miniWaveform.classList.add('active')
    waveInterval = setInterval(() => {
      waveBars.forEach(b => { b.style.height = (2 + Math.random() * 10) + 'px' })
      miniBars.forEach(b => { b.style.height = (6 + Math.random() * 26) + 'px' })
    }, 130)
  }
  function stopWave() {
    if (waveInterval) { clearInterval(waveInterval); waveInterval = null }
    waveform.classList.remove('active')
    miniWaveform.classList.remove('active')
    const defaultH = [3,5,2,4,6,3,5,2,4,1]
    waveBars.forEach((b, i) => { b.style.height = (defaultH[i] || 3) + 'px' })
    miniBars.forEach((b, i) => { b.style.height = (miniDefaultH[i] || 12) + 'px' })
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

  // ── Theme toggle (sun/moon pill) ──
  let isDark = true
  const sunOpt = document.querySelector('.sun-opt')
  const moonOpt = document.querySelector('.moon-opt')

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    isDark = (theme !== 'light')
    sunOpt.classList.toggle('active-light', !isDark)
    moonOpt.classList.toggle('active-dark', isDark)
  }

  document.getElementById('theme-toggle').addEventListener('pointerdown', () => {
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

    const btnDictate = document.getElementById('btn-dictate')
    const btnRead = document.getElementById('btn-read')
    const dictateLabel = document.getElementById('dictate-label')
    const readLabel = document.getElementById('read-label')

    // Reset expanded mode
    btnDictate.classList.remove('active')
    btnRead.classList.remove('active')
    dictateLabel.textContent = 'Dictate'
    readLabel.textContent = 'Read Selection'

    // Reset pill mode
    miniMicBtn.classList.remove('recording')
    miniMicBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="1" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="21" x2="12" y2="17"/></svg>`
    miniDoneBtn.classList.remove('visible')

    // 1. DICTATING
    if (dictating) {
      appStatus.textContent = 'LISTENING...'
      btnDictate.classList.add('active')
      dictateLabel.textContent = 'Stop Dictating'
      // Pill: pulsing mic + Done button
      miniMicBtn.classList.add('recording')
      miniDoneBtn.classList.add('visible')
      startWave()
      return
    }

    // 2. READING
    if (reading) {
      appStatus.textContent = 'READING ALOUD'
      btnRead.classList.add('active')
      readLabel.textContent = 'Stop Reading'
      miniReadBtn.classList.add('reading-active')
      startWave()
      return
    }

    // 3. PROCESSING
    if (processing) {
      stopWave()
      if (modelProgress !== undefined && modelProgress < 100) {
        appStatus.textContent = `DOWNLOADING — ${modelProgress}%`
      } else {
        appStatus.textContent = 'PROCESSING...'
        dictateLabel.textContent = 'Processing...'
      }
      return
    }

    // 4. IDLE
    appStatus.textContent = 'READY TO LISTEN'
    stopWave()
  }

  window.api.getStatus().then(applyStatus)
  window.api.onStatusChange(applyStatus)

  // ── Button handlers ──
  const dictateAction = () => window.api.toggleDictation()
  const readAction = () => window.api.toggleReading()

  // Expanded mode
  document.getElementById('btn-dictate').addEventListener('pointerdown', dictateAction)
  document.getElementById('btn-read').addEventListener('pointerdown', readAction)

  // Pill mode
  document.getElementById('mini-btn-dictate').addEventListener('pointerdown', dictateAction)
  document.getElementById('mini-btn-read').addEventListener('pointerdown', readAction)
  document.getElementById('mini-done-btn').addEventListener('pointerdown', dictateAction) // Done = stop dictating

  document.getElementById('btn-history').addEventListener('pointerdown', () => window.api.openHistory())
  document.getElementById('btn-settings').addEventListener('pointerdown', () => window.api.openSettings())
  document.getElementById('btn-quit').addEventListener('pointerdown', () => window.api.quitApp())
  document.getElementById('btn-close').addEventListener('pointerdown', () => window.api.hideWindow())
}
