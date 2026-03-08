export function renderSettings() {
  document.title = 'VoiceAssist — Settings'
  const style = document.createElement('style')
  style.textContent = `
    body { display: flex; flex-direction: column; height: 100vh; overflow: hidden; background: var(--bg); }

    header {
      padding: 0; border-bottom: none; display: none;
    }

    .layout { display: flex; flex: 1; overflow: hidden; }

    /* ── Sidebar ─────────────────────────────── */
    nav {
      width: 210px; padding: 0;
      background: var(--bg-elevated);
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column; flex-shrink: 0;
    }
    .nav-brand {
      padding: 20px 18px 16px;
      border-bottom: 1px solid var(--border);
    }
    .nav-brand .logo {
      display: flex; align-items: center; gap: 10px;
    }
    .nav-brand .logo-icon {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg, #2563EB, #7C3AED);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px;
    }
    .nav-brand .logo-text { font-size: 14px; font-weight: 700; color: var(--text); }
    .nav-brand .logo-ver  { font-size: 10px; color: var(--text-muted); margin-top: 1px; text-transform: uppercase; letter-spacing: 0.04em; }

    .nav-items { padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; flex: 1; }
    nav button {
      justify-content: flex-start; padding: 10px 14px;
      background: transparent; border: none; border-radius: 8px;
      font-size: 13px; color: var(--text-secondary);
      font-weight: 500;
      transition: all 0.15s;
    }
    nav button:hover  { background: var(--surface); color: var(--text); }
    nav button.active { background: var(--accent); color: white; }

    /* ── Panels ───────────────────────────────── */
    .panels { flex: 1; overflow-y: auto; padding: 28px 32px; }
    .panel  { display: none; flex-direction: column; gap: 24px; }
    .panel.visible { display: flex; animation: fadeIn 0.2s ease; }
    .panel-header h1 { font-size: 26px; font-weight: 700; color: var(--text); margin-bottom: 4px; }
    .panel-header p  { font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }

    .section { display: flex; flex-direction: column; gap: 8px; }
    .section > h3 { margin-bottom: 4px; }
    .field   { display: flex; flex-direction: column; gap: 6px; }
    .note    { font-size: 12px; color: var(--text-secondary); line-height: 1.6; }
    hr       { border: none; border-top: 1px solid var(--border); margin: 4px 0; }

    /* ── Setting Rows ─────────────────────────── */
    .toggle-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px; gap: 14px;
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      transition: background 0.15s;
    }
    .toggle-row:hover { background: var(--surface-2); }
    .toggle-row .lhs { display: flex; align-items: center; gap: 12px; flex: 1; }
    .toggle-row .lhs .icon-wrap {
      width: 36px; height: 36px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; flex-shrink: 0;
    }
    .toggle-row .lhs .text-wrap { flex: 1; }
    .toggle-row .lhs label { margin: 0; color: var(--text); font-weight: 500; font-size: 14px; }
    .toggle-row .lhs .sub  { font-size: 12px; color: var(--text-secondary); margin-top: 1px; }

    .switch { position: relative; width: 44px; height: 24px; flex-shrink: 0; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute; inset: 0; border-radius: 24px;
      background: var(--surface-2); cursor: pointer; transition: background 0.2s;
    }
    .slider::before {
      content: ''; position: absolute;
      width: 20px; height: 20px; border-radius: 50%;
      left: 2px; top: 2px; background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      transition: transform 0.2s;
    }
    input:checked ~ .slider { background: var(--accent); }
    input:checked ~ .slider::before { transform: translateX(20px); }

    /* ── Hotkey recorder ──────────────────────── */
    .hotkey-recorder { display: flex; gap: 8px; align-items: center; }
    .hotkey-display {
      flex: 1; padding: 10px 14px;
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: var(--radius-sm); color: var(--text);
      font-family: 'Inter', monospace; font-size: 12px; font-weight: 600;
      cursor: pointer; user-select: none; text-align: center;
      transition: border-color 0.15s;
      letter-spacing: 0.02em;
    }
    .hotkey-display:hover       { border-color: var(--accent); }
    .hotkey-display.recording   { border-color: var(--green); color: var(--green); animation: blink 0.8s infinite; }

    /* ── Save Bar ─────────────────────────────── */
    .save-bar {
      padding: 16px 32px; border-top: 1px solid var(--border);
      display: flex; gap: 10px; justify-content: flex-end;
      background: var(--bg-elevated);
    }
  `
  document.head.appendChild(style)

  const NAV = [
    { id: 'audio', label: 'General', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>` },
    { id: 'dictate', label: 'Dictation', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>` },
    { id: 'reading', label: 'Voice', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>` },
    { id: 'privacy', label: 'Privacy', icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` },
  ]

  document.body.innerHTML = `
    <div class="layout">
      <nav id="nav">
        <div class="nav-brand">
          <div class="logo">
            <div class="logo-icon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8h2v8H3zM7 5h2v14H7zM11 2h2v20h-2zM15 5h2v14h-2zM19 8h2v8h-2z"/></svg></div>
            <div>
              <div class="logo-text">VoiceAssist</div>
              <div class="logo-ver">V2.4.0 PREMIUM</div>
            </div>
          </div>
          <div class="search-wrap">
             <input type="text" placeholder="Search settings" />
          </div>
        </div>
        <div class="nav-items">
          ${NAV.map((n, i) => `
            <button data-panel="${n.id}" class="${i === 0 ? 'active' : ''}">
              <span class="nav-icon-wrap">${n.icon}</span>
              ${n.label}
            </button>
          `).join('')}
          <div class="nav-label">CONNECTED APPS</div>
          <button class="nav-sub">
            <span class="nav-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
            Integrations
          </button>
          <button class="nav-sub">
            <span class="nav-icon-wrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg></span>
            Cloud Sync
          </button>
        </div>
        <div class="nav-footer">
          <img src="https://ui-avatars.com/api/?name=Alex+Morgan&background=random" class="avatar" />
          <div class="user-info">
            <div class="user-name">Alex Morgan</div>
            <div class="user-plan">Pro Account</div>
          </div>
          <button class="logout-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
        </div>
      </nav>
      <div class="panels">

        <!-- General -->
        <div class="panel visible" id="panel-audio">
          <div class="panel-header">
            <h1>General</h1>
            <p>Manage how VoiceAssist behaves on your machine.</p>
          </div>

          <div class="section">
            <div class="nav-label">APPLICATION</div>
            <div class="toggle-row">
              <div class="lhs">
                <div class="icon-wrap" style="background: rgba(37,99,235,0.1); color: #2563EB;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                </div>
                <div class="text-wrap">
                  <label>Launch at startup</label>
                  <div class="sub">Automatically open VoiceAssist when you log in</div>
                </div>
              </div>
              <label class="switch">
                <input type="checkbox" checked />
                <span class="slider"></span>
              </label>
            </div>
            <div class="toggle-row">
              <div class="lhs">
                <div class="icon-wrap" style="background: rgba(245,158,11,0.1); color: #F59E0B;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                </div>
                <div class="text-wrap">
                  <label>Sound effects</label>
                  <div class="sub">Play confirmation tones when dictation starts</div>
                </div>
              </div>
              <label class="switch">
                <input id="sound-effects" type="checkbox" checked />
                <span class="slider"></span>
              </label>
            </div>
            <div class="toggle-row">
              <div class="lhs">
                <div class="icon-wrap" style="background: rgba(59,130,246,0.1); color: #3B82F6;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                </div>
                <div class="text-wrap">
                  <label>Appearance</label>
                  <div class="sub">Switch between Dark and Light mode</div>
                </div>
              </div>
              <button class="theme-toggle" id="settings-theme-toggle">
                <div class="thumb"></div>
              </button>
            </div>
          </div>

          <div class="section">
            <div class="nav-label">AUDIO SOURCE</div>
            <div class="toggle-row">
               <div class="lhs">
                <div class="icon-wrap" style="background: rgba(16,185,129,0.1); color: #10B981;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </div>
                <div class="text-wrap">
                  <label>Microphone Input</label>
                  <div class="sub">Select the device for speech capture</div>
                </div>
              </div>
              <select id="mic-select" class="premium-select"><option value="default">Default microphone</option></select>
            </div>
            <div class="toggle-row">
               <div class="lhs">
                <div class="icon-wrap" style="background: rgba(124,58,237,0.1); color: #7C3AED;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <div class="text-wrap">
                  <label>Language</label>
                  <div class="sub">Select your primary dictation language</div>
                </div>
              </div>
              <select id="lang-select" class="premium-select">
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
                <option value="es-ES">Spanish</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Dictation -->
        <div class="panel" id="panel-dictate">
          <div class="panel-header">
            <h1>Dictation</h1>
            <p>Configure how VoiceAssist turns your speech into text.</p>
          </div>

          <div class="section">
            <div class="nav-label">DICTATION ENGINE</div>
            <div class="toggle-row">
              <div class="lhs">
                <div class="icon-wrap" style="background: rgba(139,92,246,0.1); color: #8B5CF6;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                </div>
                <div class="text-wrap">
                  <label>Whisper Model Selection</label>
                  <div class="sub">Choose between speed or accuracy</div>
                </div>
              </div>
              <select class="premium-select"><option>Whisper Large v3 (Best)</option><option>Whisper Base (Fast)</option></select>
            </div>
            <div class="toggle-row">
              <div class="lhs">
                <div class="icon-wrap" style="background: rgba(16,185,129,0.1); color: #10B981;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                </div>
                <div class="text-wrap">
                  <label>Auto-punctuation</label>
                  <div class="sub">Automatically insert commas and periods</div>
                </div>
              </div>
              <label class="switch">
                <input id="auto-punct" type="checkbox" checked />
                <span class="slider"></span>
              </label>
            </div>
             <div class="toggle-row">
              <div class="lhs">
                <div class="icon-wrap" style="background: rgba(236,72,153,0.1); color: #EC4899;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>
                </div>
                <div class="text-wrap">
                  <label>Hotkey mapping</label>
                  <div class="sub">Shortcut to toggle listening</div>
                </div>
              </div>
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                <div class="hotkey-display" id="dictation-hotkey">CMD + SHIFT + SPACE</div>
                <button id="reset-dictation-hotkey" class="premium-btn-sm" style="font-size:10px; padding:4px 8px;">Reset Default</button>
              </div>
            </div>
            <div class="toggle-row">
              <div class="lhs">
                <div class="icon-wrap" style="background: rgba(59,130,246,0.1); color: #3B82F6;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <div class="text-wrap">
                  <label>Remove filler words</label>
                  <div class="sub">Filter out "um", "ah", "like" automatically</div>
                </div>
              </div>
              <label class="switch">
                <input id="remove-fillers" type="checkbox" checked />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="section">
            <div class="nav-label">TEXT POLISH</div>
            <div class="toggle-row">
              <div class="lhs">
                <div class="icon-wrap" style="background: rgba(124,58,237,0.1); color: #7C3AED;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <div class="text-wrap">
                  <label>Spelling region</label>
                  <div class="sub">Choose UK or US English spelling (colour vs color)</div>
                </div>
              </div>
              <select id="spelling-locale" class="premium-select">
                <option value="uk">UK English</option>
                <option value="us">US English</option>
              </select>
            </div>
            <div class="toggle-row">
              <div class="lhs">
                <div class="icon-wrap" style="background: rgba(16,185,129,0.1); color: #10B981;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </div>
                <div class="text-wrap">
                  <label>Auto-correct spelling</label>
                  <div class="sub">Fix common misspellings in dictated text</div>
                </div>
              </div>
              <label class="switch">
                <input id="fix-spelling" type="checkbox" checked />
                <span class="slider"></span>
              </label>
            </div>
            <div class="toggle-row">
              <div class="lhs">
                <div class="icon-wrap" style="background: rgba(245,158,11,0.1); color: #F59E0B;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </div>
                <div class="text-wrap">
                  <label>Grammar cleanup</label>
                  <div class="sub">Auto-capitalise, fix spacing, add missing full stops</div>
                </div>
              </div>
              <label class="switch">
                <input id="fix-grammar" type="checkbox" checked />
                <span class="slider"></span>
              </label>
            </div>
          </div>
        </div>

        <!-- Voice -->
        <div class="panel" id="panel-reading">
          <div class="panel-header">
            <h1>Voice Synthesis</h1>
            <p>Ultra-realistic AI voices powered by OpenAI.</p>
          </div>

          <div class="section">
            <div class="nav-label">VOICE SETTINGS</div>
             <div class="toggle-row">
                <div class="lhs">
                  <div class="icon-wrap" style="background: rgba(6,182,212,0.1); color: #06B6D4;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                  </div>
                  <div class="text-wrap">
                    <label>Natural Voice</label>
                    <div class="sub">System voice for screen reading</div>
                  </div>
                </div>
                <select id="voice-select" class="premium-select">
                  <optgroup id="piper-voices-group" label="Piper Voices (Free, Natural)"></optgroup>
                  <optgroup label="Premium AI Voices (Needs API Key)">
                    <option value="openai:alloy">Alloy (Balanced)</option>
                    <option value="openai:echo">Echo (Warm)</option>
                    <option value="openai:fable">Fable (Expressive)</option>
                    <option value="openai:onyx">Onyx (Deep)</option>
                    <option value="openai:nova">Nova (Energetic)</option>
                    <option value="openai:shimmer">Shimmer (Clear)</option>
                  </optgroup>
                  <optgroup id="system-voices-group" label="System Voices (Fallback)"></optgroup>
                </select>
             </div>
             <div class="toggle-row">
                <div class="lhs">
                  <div class="icon-wrap" style="background: rgba(249,115,22,0.1); color: #F97316;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  </div>
                  <div class="text-wrap">
                    <label>Default Speed</label>
                    <div class="sub">Adjust the pace of speech playback</div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:12px; flex:1; justify-content: flex-end;">
                  <span id="speed-display" style="font-size:12px; font-weight:600; color: #3B82F6; width: 40px; text-align: right;">1.00x</span>
                  <input id="speed-slider" type="range" min="0.5" max="2" step="0.05" value="1.0" style="width: 150px;" />
                </div>
             </div>
          </div>

          <div class="section" style="margin-top: 12px">
            <div class="nav-label">OAI API KEY</div>
            <div class="toggle-row">
              <input id="openai-key" type="password" placeholder="sk-..." class="premium-input" style="flex: 1" />
              <button id="validate-key" class="premium-btn-sm">Validate Key</button>
            </div>
            <div id="key-status" style="font-size:11px; margin-top: -4px; padding-left: 8px"></div>
          </div>

          <div class="section" style="margin-top: 12px">
            <div class="nav-label">VOICE HOTKEY & TOOLS</div>
            <div class="toggle-row">
              <div class="lhs">
                 <div class="icon-wrap" style="background: rgba(139,92,246,0.1); color: #8B5CF6;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/></svg>
                </div>
                <div class="text-wrap">
                  <label>Read Hotkey</label>
                  <div class="sub">Shortcut to read highlighted text</div>
                </div>
              </div>
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
                <div class="hotkey-display" id="read-hotkey">CMD + ALT + R</div>
                <button id="reset-read-hotkey" class="premium-btn-sm" style="font-size:10px; padding:4px 8px;">Reset Default</button>
              </div>
            </div>
             <div class="toggle-row">
               <div class="lhs">
                <div class="icon-wrap" style="background: rgba(124,58,237,0.1); color: #7C3AED;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                </div>
                <div class="text-wrap">
                  <label>Translation</label>
                  <div class="sub">Language to translate into before reading</div>
                </div>
              </div>
              <select id="translate-lang" class="premium-select">
                <option value="none">Off</option>
                <option value="en">English</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="es">Spanish</option>
              </select>
            </div>
            <div class="toggle-row" style="border:none; background:transparent;">
               <button id="test-voice" class="premium-btn" style="width:100%;">🔊 Test Voice Selection</button>
            </div>
          </div>
        </div>

        <!-- Privacy -->
        <div class="panel" id="panel-privacy">
           <div class="panel-header">
            <h1>Privacy</h1>
            <p>Your data stays on your machine.</p>
          </div>
          <div class="section">
            <div class="toggle-row">
               <div class="lhs">
                <div class="icon-wrap" style="background: rgba(16,185,129,0.1); color: #10B981;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div class="text-wrap">
                  <label>Local Processing Only</label>
                  <div class="sub">Your voice data never leaves this computer.</div>
                </div>
              </div>
              <span class="status-pill success">Always On</span>
            </div>
             <div class="toggle-row" style="margin-top: 20px; border-color: rgba(239, 68, 68, 0.2)">
               <div class="lhs">
                <div class="icon-wrap" style="background: rgba(239,68,68,0.1); color: #EF4444;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </div>
                <div class="text-wrap">
                  <label style="color: #EF4444">Clear All History</label>
                  <div class="sub">Permanently delete all dictation logs.</div>
                </div>
              </div>
              <button id="clear-history" class="premium-btn-danger">Clear</button>
            </div>
          </div>
        </div>

      </div>
    </div>
    <div class="save-bar">
      <div style="flex: 1"></div>
      <button id="btn-cancel" class="cancel-link">Cancel</button>
      <button id="btn-save" class="premium-btn">Save Settings</button>
    </div>
  `

  // ── Hotkey recorder helper ──────────────────────────────────────
  const DEFAULT_DICTATION = window.navigator.platform.includes('Mac') ? 'Command+Shift+Space' : 'Control+Shift+Space'
  const DEFAULT_READ = window.navigator.platform.includes('Mac') ? 'Command+Alt+R' : 'Control+Alt+R'

  function makeHotkeyRecorder(el, defaultHotkey) {
    let current = defaultHotkey
    let recording = false

    function display(hotkey) {
      // Convert Electron format to readable: Command+Shift+Space → ⌘ Shift Space
      el.textContent = hotkey
        .replace('Command', '⌘')
        .replace('Control', 'Ctrl')
        .replace('Alt', 'Alt')
        .replace(/\+/g, ' + ')
    }

    function startRecording() {
      recording = true
      el.classList.add('recording')
      el.textContent = '🔴 Press your keys now…'
      el.focus()
    }

    function stopRecording(hotkey) {
      recording = false
      current = hotkey
      el.classList.remove('recording')
      display(hotkey)
    }

    el.addEventListener('click', startRecording)

    el.addEventListener('keydown', (e) => {
      if (!recording) return
      e.preventDefault()
      e.stopPropagation()

      // Don't accept modifier-only presses
      if (['Meta', 'Control', 'Shift', 'Alt'].includes(e.key)) return

      const parts = []
      if (e.metaKey) parts.push('Command')
      if (e.ctrlKey) parts.push('Control')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')

      // Format the key
      let key = e.key
      if (key === ' ') key = 'Space'
      else if (key.length === 1) key = key.toUpperCase()
      parts.push(key)

      // Need at least one modifier
      const hasModifier = e.metaKey || e.ctrlKey || e.altKey || e.shiftKey
      if (!hasModifier) {
        el.textContent = '⚠️ Please include Ctrl, Alt or Shift'
        setTimeout(() => startRecording(), 1200)
        return
      }

      stopRecording(parts.join('+'))
    })

    el.setAttribute('tabindex', '0')
    display(defaultHotkey)

    return {
      getValue: () => current,
      setValue: (v) => { current = v; display(v) }
    }
  }

  const dictationRecorder = makeHotkeyRecorder(
    document.getElementById('dictation-hotkey'), DEFAULT_DICTATION
  )
  const readRecorder = makeHotkeyRecorder(
    document.getElementById('read-hotkey'), DEFAULT_READ
  )

  document.getElementById('reset-dictation-hotkey').addEventListener('click', () => {
    dictationRecorder.setValue(DEFAULT_DICTATION)
  })
  document.getElementById('reset-read-hotkey').addEventListener('click', () => {
    readRecorder.setValue(DEFAULT_READ)
  })

  // ── Nav tabs ────────────────────────────────────────────────────
  document.querySelectorAll('#nav button[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const panelId = btn.getAttribute('data-panel')
      if (!panelId) return

      document.querySelectorAll('#nav button').forEach(b => b.classList.remove('active'))
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('visible'))

      btn.classList.add('active')
      const targetPanel = document.getElementById(`panel-${panelId}`)
      if (targetPanel) targetPanel.classList.add('visible')
    })
  })

  // ── Theme toggle logic ──
  const themeToggle = document.getElementById('settings-theme-toggle')
  let isDark = true
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme)
    isDark = (theme !== 'light')
    if (themeToggle) themeToggle.classList.toggle('light', !isDark)
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      isDark = !isDark
      const newTheme = isDark ? 'dark' : 'light'
      applyTheme(newTheme)
      window.api.setSetting('theme', newTheme)
    })
  }

  // ── Load saved settings ─────────────────────────────────────────
  window.api.getSettings().then(s => {
    if (s.theme) applyTheme(s.theme)
    document.getElementById('lang-select').value = s.language || 'en-US'
    document.getElementById('auto-punct').checked = s.autoPunctuation !== false

    // Load Piper voices (grouped by gender)
    window.api.listPiperVoices().then(piperVoices => {
      const piperGroup = document.getElementById('piper-voices-group')
      if (piperGroup && piperVoices.length > 0) {
        piperGroup.innerHTML = piperVoices.map(v => {
          return `<option value="piper:${v.file}">${v.label}</option>`
        }).join('')
      }
      // Set voice after Piper voices are loaded
      if (s.voice) document.getElementById('voice-select').value = s.voice
    })

    // Load system voices (fallback)
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length === 0) return
      const group = document.getElementById('system-voices-group')
      if (group) {
        group.innerHTML = voices.map(v => `<option value="${v.voiceURI}">${v.name} (${v.lang})</option>`).join('')
      }
      if (s.voice) document.getElementById('voice-select').value = s.voice
    }
    loadVoices()
    window.speechSynthesis.onvoiceschanged = loadVoices

    if (s.openaiApiKey) document.getElementById('openai-key').value = s.openaiApiKey

    document.getElementById('speed-slider').value = s.readingSpeed || 1.0
    document.getElementById('speed-display').textContent = (s.readingSpeed || 1.0).toFixed(2) + '×'

    // New settings
    document.getElementById('remove-fillers').checked = s.removeFillerWords !== false
    document.getElementById('sound-effects').checked = s.soundEffects !== false
    document.getElementById('translate-lang').value = s.translationLanguage || 'en'

    // Text polish settings
    document.getElementById('spelling-locale').value = s.spellingLocale || 'uk'
    document.getElementById('fix-spelling').checked = s.fixSpelling !== false
    document.getElementById('fix-grammar').checked = s.fixGrammar !== false

    if (s.dictationHotkey) dictationRecorder.setValue(s.dictationHotkey)
    if (s.readHotkey) readRecorder.setValue(s.readHotkey)
  })

  document.getElementById('speed-slider').addEventListener('input', e => {
    document.getElementById('speed-display').textContent = Number(e.target.value).toFixed(2) + '×'
  })

  // ── Validate API Key ────────────────────────────────────────────
  document.getElementById('validate-key').addEventListener('click', async () => {
    const key = document.getElementById('openai-key').value.trim()
    const status = document.getElementById('key-status')
    if (!key || key.length < 10) {
      status.innerHTML = '❌ <span style="color:#ef4444">Please enter a valid API key (starts with sk-...)</span>'
      return
    }
    status.innerHTML = '⏳ Testing your key...'
    try {
      const resp = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key} `, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'tts-1', input: 'Test.', voice: 'nova', speed: 1.0 }),
      })
      if (resp.ok) {
        status.innerHTML = '✅ <span style="color:#22c55e"><strong>Key is valid!</strong> Premium AI voices are ready to use.</span>'
      } else {
        const err = await resp.json().catch(() => ({}))
        status.innerHTML = `❌ <span style="color:#ef4444"><strong>Key failed (${resp.status}):</strong> ${err?.error?.message || 'Unknown error. Check your key and billing.'}</span>`
      }
    } catch (e) {
      status.innerHTML = '❌ <span style="color:#ef4444">Network error — check your internet connection.</span>'
    }
  })

  // ── Test Voice ──────────────────────────────────────────────────
  document.getElementById('test-voice').addEventListener('click', async () => {
    const testText = "Hi there, I am Voice Assist. You can use me to read any text out loud."
    const selectedUri = document.getElementById('voice-select').value
    const speed = Number(document.getElementById('speed-slider').value) || 1.0

    // Piper TTS test
    if (selectedUri && selectedUri.startsWith('piper:')) {
      const btn = document.getElementById('test-voice')
      btn.textContent = '⏳ Generating...'
      btn.disabled = true
      try {
        const voiceFile = selectedUri.split(':')[1]
        const result = await window.api.piperSpeak(testText, voiceFile, speed)
        if (result && result.wav) {
          const blob = new Blob([new Uint8Array(result.wav)], { type: 'audio/wav' })
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)
          audio.onended = () => URL.revokeObjectURL(url)
          audio.play()
        }
      } catch (err) {
        alert('Piper TTS error: ' + err.message)
      }
      btn.textContent = '🔊 Test Voice'
      btn.disabled = false
      return
    }

    // If an OpenAI voice is selected, test it via the API
    if (selectedUri && selectedUri.startsWith('openai:')) {
      const key = document.getElementById('openai-key').value.trim()
      if (!key || key.length < 10) {
        alert('Please enter your OpenAI API key above first, then click Validate Key.')
        return
      }
      const btn = document.getElementById('test-voice')
      btn.textContent = '⏳ Generating...'
      btn.disabled = true
      try {
        const resp = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${key} `, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'tts-1', input: testText, voice: selectedUri.split(':')[1], speed }),
        })
        if (resp.ok) {
          const blob = await resp.blob()
          const url = URL.createObjectURL(blob)
          const audio = new Audio(url)
          audio.onended = () => URL.revokeObjectURL(url)
          audio.play()
        } else {
          const err = await resp.json().catch(() => ({}))
          alert(`OpenAI error: ${err?.error?.message || 'Unknown error. Check your key.'} `)
        }
      } catch (e) {
        alert('Network error — check your internet.')
      }
      btn.textContent = '🔊 Test Voice'
      btn.disabled = false
      return
    }

    // System voice test
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(testText)
    utterance.rate = speed
    if (selectedUri) {
      const voices = window.speechSynthesis.getVoices()
      const match = voices.find(v => v.voiceURI === selectedUri)
      if (match) utterance.voice = match
    }
    window.speechSynthesis.speak(utterance)
  })

  // ── Save ────────────────────────────────────────────────────────
  document.getElementById('btn-save').addEventListener('click', async () => {
    const pairs = {
      language: document.getElementById('lang-select').value,
      dictationHotkey: dictationRecorder.getValue(),
      readHotkey: readRecorder.getValue(),
      autoPunctuation: document.getElementById('auto-punct').checked,
      removeFillerWords: document.getElementById('remove-fillers').checked,
      soundEffects: document.getElementById('sound-effects').checked,
      voice: document.getElementById('voice-select').value,
      readingSpeed: Number(document.getElementById('speed-slider').value),
      translationLanguage: document.getElementById('translate-lang').value,
      openaiApiKey: document.getElementById('openai-key')?.value?.trim() || '',
      spellingLocale: document.getElementById('spelling-locale').value,
      fixSpelling: document.getElementById('fix-spelling').checked,
      fixGrammar: document.getElementById('fix-grammar').checked,
    }
    for (const [k, v] of Object.entries(pairs)) await window.api.setSetting(k, v)
    // Re-register hotkeys immediately — no restart needed
    await window.api.reRegisterHotkeys()

    // Show a visible confirmation toast so the user knows it saved
    const btn = document.getElementById('btn-save')
    btn.textContent = '✅ Settings Saved!'
    btn.style.background = 'var(--green, #22c55e)'
    btn.disabled = true

    // Show macOS system notification
    new Notification('VoiceAssist', {
      body: 'Settings saved! VoiceAssist is still running in your menu bar ↗',
      silent: true,
    })

    setTimeout(() => {
      btn.textContent = 'Save Settings'
      btn.style.background = ''
      btn.disabled = false
    }, 1500)
  })

  document.getElementById('btn-cancel').addEventListener('click', () => window.api.hideWindow())
  document.getElementById('clear-history').addEventListener('click', async () => {
    if (confirm('Clear all dictation history? This cannot be undone.')) {
      await window.api.clearHistory(); alert('History cleared.')
    }
  })
}
