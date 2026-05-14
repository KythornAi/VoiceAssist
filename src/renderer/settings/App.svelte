<script lang="ts">
  import type { PolishSettings, SttSettings, TtsSettings, HistoryItem, FormatMode, VoiceInfo } from '../../shared/types'

  type Tab = 'settings' | 'history' | 'audio'

  let activeTab = $state<Tab>('settings')

  let polish = $state<PolishSettings | null>(null)
  let stt = $state<SttSettings | null>(null)
  let tts = $state<TtsSettings | null>(null)
  let vocab = $state<Record<string, string>>({})
  let hasOpenAIKey = $state(false)
  let newKey = $state('')
  let showKeyInput = $state(false)
  let newSpoken = $state('')
  let newReplace = $state('')
  let vocabError = $state('')
  let saved = $state(false)
  let savedTimer: ReturnType<typeof setTimeout> | null = null
  let audioDevices = $state<MediaDeviceInfo[]>([])

  let history = $state<HistoryItem[]>([])
  let historyCopied = $state<string | null>(null)

  let voices = $state<VoiceInfo[]>([])

  const FORMAT_MODES: FormatMode[] = ['note', 'email', 'chat', 'terminal']

  const OPENAI_VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer']
  const TTS_SPEEDS: { label: string; value: number }[] = [
    { label: '0.75×', value: 0.75 },
    { label: '1×', value: 1 },
    { label: '1.25×', value: 1.25 },
    { label: '1.5×', value: 1.5 },
  ]

  const FORMAT_MODE_DESCRIPTIONS: Record<FormatMode, string> = {
    note: 'Plain transcription with no extra formatting. Best for general dictation.',
    email: 'Detects greetings and sign-offs and lays out greeting, body and sign-off on separate lines.',
    chat: 'Removes the trailing full stop for a casual messaging feel.',
    terminal: 'Lowercases everything and strips all punctuation. Designed for command-line input.',
  }

  $effect(() => {
    void loadSettings()
  })

  async function loadSettings() {
    const [p, s, t, v, k] = await Promise.all([
      window.api.getSettings(),
      window.api.getSttSettings(),
      window.api.getTtsSettings(),
      window.api.getVocab(),
      window.api.hasOpenAIKey(),
    ])
    polish = p
    stt = s
    tts = t
    vocab = v
    hasOpenAIKey = k
    void loadAudioDevices()
  }

  async function loadAudioDevices() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
    } catch { /* labels will be generic if permission denied */ }
    const all = await navigator.mediaDevices.enumerateDevices()
    audioDevices = all.filter(d => d.kind === 'audioinput')
  }

  function onTabChange(tab: Tab) {
    activeTab = tab
    if (tab === 'history') void loadHistory()
    if (tab === 'audio') void loadVoices()
  }

  async function loadHistory() {
    history = await window.api.getHistory()
  }

  async function loadVoices() {
    voices = await window.api.listVoices()
  }

  async function onSave() {
    if (!polish) return
    try {
      const saves: Promise<unknown>[] = [window.api.setSettings({ ...polish })]
      if (stt) saves.push(window.api.setSttSettings({ ...stt }))
      if (tts) saves.push(window.api.setTtsSettings({ ...tts }))
      await Promise.all(saves)
      if (savedTimer) clearTimeout(savedTimer)
      saved = true
      savedTimer = setTimeout(() => { saved = false }, 2000)
    } catch (err) {
      console.error('Save failed', err)
    }
  }

  async function onSaveKey() {
    if (!newKey.trim()) return
    await window.api.setOpenAIKey(newKey.trim())
    hasOpenAIKey = true
    newKey = ''
    showKeyInput = false
  }

  async function onClearKey() {
    await window.api.clearOpenAIKey()
    hasOpenAIKey = false
  }

  function onAddVocab() {
    if (!newSpoken.trim()) { vocabError = 'Spoken word required'; return }
    if (!newReplace.trim()) { vocabError = 'Replace with required'; return }
    vocabError = ''
    void window.api.setVocabEntry(newSpoken.trim(), newReplace.trim()).then(() => {
      vocab = { ...vocab, [newSpoken.trim().toLowerCase()]: newReplace.trim() }
      newSpoken = ''
      newReplace = ''
    })
  }

  function onDeleteVocab(key: string) {
    void window.api.deleteVocabEntry(key).then(() => {
      const { [key]: _, ...rest } = vocab
      vocab = rest
    })
  }

  async function onClearHistory() {
    await window.api.clearHistory()
    history = []
  }

  function onCopyHistory(item: HistoryItem) {
    void navigator.clipboard.writeText(item.text).then(() => {
      historyCopied = item.id
      setTimeout(() => { historyCopied = null }, 1500)
    })
  }

  function formatDate(ts: string): string {
    const d = new Date(ts)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return isToday ? `${time} · Today` : `${time} · ${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}`
  }
</script>

<main>
  <header>
    <span class="app-name">VoiceAssist</span>
    <nav>
      {#each (['settings', 'history', 'audio'] as Tab[]) as tab}
        <button
          class="tab-btn"
          class:active={activeTab === tab}
          onclick={() => onTabChange(tab)}
        >{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
      {/each}
    </nav>
  </header>

  {#if activeTab === 'settings' && polish && stt}
    <div class="tab-content">

      <section>
        <h2>Format Mode</h2>
        <div class="mode-row">
          {#each FORMAT_MODES as mode}
            <button class="mode-chip" class:active={polish.formatMode === mode}
              onclick={() => { if (polish) polish = { ...polish, formatMode: mode } }}
            >{mode.charAt(0).toUpperCase() + mode.slice(1)}</button>
          {/each}
        </div>
        <p class="hint">{FORMAT_MODE_DESCRIPTIONS[polish.formatMode]}</p>
      </section>

      <section>
        <h2>Text Polish</h2>
        <div class="toggle-list">
          <label class="toggle-row">
            <div><strong>Fix spelling</strong><small>Correct common misspellings in dictated text</small></div>
            <input type="checkbox" checked={polish.fixSpelling}
              onchange={(e) => { if (polish) polish = { ...polish, fixSpelling: (e.target as HTMLInputElement).checked } }} />
          </label>
          <label class="toggle-row">
            <div><strong>Grammar cleanup</strong><small>Auto-capitalise, fix spacing, add missing full stops</small></div>
            <input type="checkbox" checked={polish.fixGrammar}
              onchange={(e) => { if (polish) polish = { ...polish, fixGrammar: (e.target as HTMLInputElement).checked } }} />
          </label>
          <label class="toggle-row">
            <div><strong>Remove filler words</strong><small>Filter out "um", "ah", "like" from dictated text</small></div>
            <input type="checkbox" checked={polish.removeFillerWords}
              onchange={(e) => { if (polish) polish = { ...polish, removeFillerWords: (e.target as HTMLInputElement).checked } }} />
          </label>
          <label class="toggle-row">
            <div><strong>Paste at cursor automatically</strong><small>Insert transcribed text wherever your cursor is (macOS only)</small></div>
            <input type="checkbox" checked={polish.pasteAtCursor}
              onchange={(e) => { if (polish) polish = { ...polish, pasteAtCursor: (e.target as HTMLInputElement).checked } }} />
          </label>
        </div>
      </section>

      <section>
        <h2>Microphone</h2>
        {#if audioDevices.length === 0}
          <p class="hint">No audio input devices found.</p>
        {:else}
          <div class="device-list">
            <label class="device-row">
              <input type="radio" name="device" value=""
                checked={!polish.audioDeviceId}
                onchange={() => { if (polish) polish = { ...polish, audioDeviceId: '' } }} />
              <span>System Default</span>
            </label>
            {#each audioDevices as device}
              <label class="device-row">
                <input type="radio" name="device" value={device.deviceId}
                  checked={polish.audioDeviceId === device.deviceId}
                  onchange={() => { if (polish) polish = { ...polish, audioDeviceId: device.deviceId } }} />
                <span>{device.label || `Microphone (${device.deviceId.slice(0, 8)}…)`}</span>
              </label>
            {/each}
          </div>
        {/if}
      </section>

      <section>
        <h2>Custom Vocabulary</h2>
        <p class="hint">Add words Whisper gets wrong. Applied after text polish.</p>
        {#if Object.keys(vocab).length > 0}
          <table>
            <thead><tr><th>Spoken word</th><th>Replace with</th><th></th></tr></thead>
            <tbody>
              {#each Object.entries(vocab) as [key, val]}
                <tr>
                  <td>"{key}"</td>
                  <td>{val}</td>
                  <td><button class="del" onclick={() => onDeleteVocab(key)}>Delete</button></td>
                </tr>
              {/each}
            </tbody>
          </table>
        {:else}
          <p class="empty">No custom words yet.</p>
        {/if}
        <div class="add-row">
          <input bind:value={newSpoken} placeholder="Spoken word" />
          <input bind:value={newReplace} placeholder="Replace with" />
          <button class="btn-primary" onclick={onAddVocab}>Add</button>
        </div>
        {#if vocabError}<p class="error">{vocabError}</p>{/if}
      </section>

      <div class="save-bar">
        <button class="btn-save" onclick={() => void onSave()}>{saved ? 'Saved!' : 'Save Changes'}</button>
      </div>
    </div>

  {:else if activeTab === 'history'}
    <div class="tab-content">
      <div class="history-header">
        <span class="history-count">{history.length} item{history.length !== 1 ? 's' : ''}</span>
        {#if history.length > 0}
          <button class="btn-ghost-red" onclick={() => void onClearHistory()}>Clear all</button>
        {/if}
      </div>
      {#if history.length === 0}
        <div class="empty-state">
          <span class="empty-icon">◷</span>
          <p>No recordings yet.<br>Transcripts will appear here.</p>
        </div>
      {:else}
        <div class="history-list">
          {#each history as item (item.id)}
            <div class="history-item">
              <div class="history-meta">
                <span class="history-date">{formatDate(item.timestamp)}</span>
                <button class="copy-btn" onclick={() => onCopyHistory(item)} title="Copy">
                  {historyCopied === item.id ? '✓' : '⎘'}
                </button>
              </div>
              <p class="history-text">"{item.text}"</p>
            </div>
          {/each}
        </div>
      {/if}
    </div>

  {:else if activeTab === 'audio' && tts && stt}
    <div class="tab-content">
      <section>
        <h2>Speech Recognition</h2>
        <div class="provider-row">
          <button class="provider-btn" class:active={stt.provider === 'local'}
            onclick={() => { if (stt) stt = { ...stt, provider: 'local' } }}>Local (Whisper)</button>
          <button class="provider-btn" class:active={stt.provider === 'openai'}
            onclick={() => { if (stt) stt = { ...stt, provider: 'openai' } }}>OpenAI Cloud</button>
        </div>
        <p class="hint">{stt.provider === 'local'
          ? 'Using on-device Whisper. Works offline. No API key needed.'
          : 'Using OpenAI cloud transcription. Requires API key. ~$0.003/min.'}</p>
        {#if stt.provider === 'openai'}
          {#if hasOpenAIKey}
            <div class="key-row">
              <span class="key-status">API key saved</span>
              <button class="btn-ghost" onclick={() => void onClearKey()}>Remove</button>
            </div>
          {:else if showKeyInput}
            <div class="add-row">
              <input type="password" bind:value={newKey} placeholder="sk-..." />
              <button class="btn-primary" onclick={() => void onSaveKey()}>Save</button>
            </div>
          {:else}
            <button class="btn-ghost" onclick={() => { showKeyInput = true }}>+ Add API key</button>
          {/if}
          {#if !hasOpenAIKey}
            <p class="key-warning">OpenAI key required to use cloud transcription.</p>
          {/if}
        {/if}
      </section>

      <section>
        <h2>Speech Synthesis</h2>
        <div class="provider-row">
          <button class="provider-btn" class:active={tts.provider === 'local'}
            onclick={() => { if (tts) tts = { ...tts, provider: 'local' } }}>Local (Piper)</button>
          <button class="provider-btn" class:active={tts.provider === 'openai'}
            onclick={() => { if (tts) tts = { ...tts, provider: 'openai' } }}>OpenAI Cloud</button>
        </div>
        <p class="hint">{tts.provider === 'local'
          ? 'Uses bundled Piper voices. Works offline. No API key needed.'
          : 'Uses OpenAI TTS. Requires API key. Higher quality than local voices. Costs apply per character.'}</p>
        {#if tts.provider === 'openai'}
          {#if hasOpenAIKey}
            <div class="key-row">
              <span class="key-status">API key saved</span>
            </div>
          {:else}
            <p class="key-warning">OpenAI key required. Add it in the Settings tab under Speech Recognition.</p>
          {/if}
          <div class="tts-select-row">
            <div class="tts-select-group">
              <span class="tts-select-label">Model</span>
              <select class="tts-select"
                value={tts.model}
                onchange={(e) => { if (tts) tts = { ...tts, model: (e.target as HTMLSelectElement).value } }}>
                <option value="tts-1">tts-1 — Fast ($15 / 1M chars)</option>
                <option value="tts-1-hd">tts-1-hd — High quality ($30 / 1M chars)</option>
                <option value="gpt-4o-mini-tts">gpt-4o-mini-tts — Instructable</option>
              </select>
            </div>
            <div class="tts-select-group">
              <span class="tts-select-label">Voice</span>
              <select class="tts-select"
                value={tts.voice}
                onchange={(e) => { if (tts) tts = { ...tts, voice: (e.target as HTMLSelectElement).value } }}>
                {#each OPENAI_VOICES as v}
                  <option value={v}>{v}</option>
                {/each}
              </select>
            </div>
          </div>
          {#if tts.model === 'gpt-4o-mini-tts'}
            <div class="instructions-group">
              <span class="tts-select-label">Voice instructions</span>
              <textarea
                class="tts-instructions"
                rows={2}
                placeholder="e.g. Speak with a deep British male accent"
                value={tts.instructions ?? ''}
                oninput={(e) => { if (tts) tts = { ...tts, instructions: (e.target as HTMLTextAreaElement).value } }}
              ></textarea>
            </div>
          {/if}
        {/if}
      </section>

      <section>
        <h2>Playback Speed</h2>
        <div class="mode-row">
          {#each TTS_SPEEDS as s}
            <button class="mode-chip" class:active={tts.speed === s.value}
              onclick={() => { if (tts) tts = { ...tts, speed: s.value } }}
            >{s.label}</button>
          {/each}
        </div>
      </section>

      {#if tts.provider === 'local'}
        {#if voices.length === 0}
          <div class="empty-state">
            <span class="empty-icon">🎙</span>
            <p>No Piper voices installed.<br>Run <code>npm run download:piper</code> to install.</p>
          </div>
        {:else}
          <section>
            <h2>Piper Voice</h2>
            <p class="hint">Select the voice used when reading selected text aloud.</p>
            <div class="voice-list">
              {#each voices as voice}
                <label class="voice-row" class:active={polish?.voiceFile === voice.file || (!polish?.voiceFile && voices[0] === voice)}>
                  <input type="radio" name="voice" value={voice.file}
                    checked={polish?.voiceFile === voice.file || (!polish?.voiceFile && voices[0] === voice)}
                    onchange={() => { if (polish) polish = { ...polish, voiceFile: voice.file } }} />
                  <div class="voice-info">
                    <span class="voice-label">{voice.label}</span>
                    <span class="voice-meta">{voice.quality} quality · {voice.lang}</span>
                  </div>
                </label>
              {/each}
            </div>
          </section>
        {/if}
      {/if}

      <div class="save-bar">
        <button class="btn-save" onclick={() => void onSave()}>{saved ? 'Saved!' : 'Save Changes'}</button>
      </div>
    </div>
  {/if}
</main>

<style>
  :global(body) { margin: 0; padding: 0; background: #07080a; }

  main {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: #07080a;
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    font-feature-settings: "calt", "kern";
    font-size: 14px;
    color: #cdcdcd;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px 0;
    border-bottom: 1px solid #1e1f22;
    flex-shrink: 0;
  }

  .app-name { font-size: 15px; font-weight: 600; color: #f4f4f6; letter-spacing: -0.01em; }

  nav { display: flex; }

  .tab-btn {
    padding: 8px 16px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: #6a6b6c;
    font-size: 13px;
    font-family: inherit;
    font-weight: 400;
    cursor: pointer;
    transition: color 0.15s;
    margin-bottom: -1px;
  }
  .tab-btn:hover { color: #cdcdcd; }
  .tab-btn.active { color: #FFB800; border-bottom-color: #FFB800; font-weight: 500; }

  .tab-content {
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    gap: 28px;
    flex: 1;
    overflow-y: auto;
  }

  section { display: flex; flex-direction: column; gap: 10px; }

  h2 {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #6a6b6c;
    margin: 0 0 4px;
  }

  .provider-row { display: flex; gap: 6px; }

  .provider-btn {
    flex: 1;
    padding: 9px 14px;
    background: #0d0e12;
    color: #9c9c9d;
    border: 1px solid #242728;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 400;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .provider-btn:hover:not(.active) { color: #cdcdcd; border-color: rgba(255,255,255,0.12); }
  .provider-btn.active { background: #FFB800; color: #000; border-color: #FFB800; font-weight: 600; }

  .mode-row { display: flex; flex-wrap: wrap; gap: 8px; }

  .mode-chip {
    padding: 5px 14px;
    border-radius: 9999px;
    border: 1px solid #2a2b30;
    background: transparent;
    color: #9c9c9d;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }
  .mode-chip:hover { color: #cdcdcd; border-color: rgba(255,255,255,0.16); }
  .mode-chip.active { border-color: #FFB800; color: #FFB800; font-weight: 500; }

  .toggle-list { display: flex; flex-direction: column; gap: 2px; }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 14px;
    background: #0d0e12;
    border: 1px solid #1e1f22;
    border-radius: 8px;
    cursor: pointer;
    gap: 12px;
    transition: border-color 0.15s;
  }
  .toggle-row:hover { border-color: rgba(255,255,255,0.1); }
  .toggle-row div { display: flex; flex-direction: column; gap: 2px; }
  .toggle-row strong { font-size: 13px; font-weight: 500; color: #f4f4f6; }
  .toggle-row small { font-size: 12px; color: #6a6b6c; }
  .toggle-row input[type='checkbox'] { width: 16px; height: 16px; flex-shrink: 0; accent-color: #FFB800; cursor: pointer; }

  .device-list { display: flex; flex-direction: column; gap: 2px; }

  .device-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: #0d0e12;
    border: 1px solid #1e1f22;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    color: #cdcdcd;
    transition: border-color 0.15s;
  }
  .device-row:hover { border-color: rgba(255,255,255,0.1); }
  .device-row input[type='radio'] { accent-color: #FFB800; flex-shrink: 0; }

  .key-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: #0d0e12;
    border: 1px solid #1e1f22;
    border-radius: 8px;
  }
  .key-status { flex: 1; font-size: 13px; color: #59d499; font-weight: 500; }

  .key-warning {
    font-size: 12px;
    color: #ffc533;
    padding: 8px 12px;
    background: rgba(255,197,51,0.08);
    border: 1px solid rgba(255,197,51,0.2);
    border-radius: 8px;
    margin: 0;
    line-height: 1.5;
  }

  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left;
    padding: 6px 10px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: #434345;
    border-bottom: 1px solid #1e1f22;
  }
  td { padding: 9px 10px; border-bottom: 1px solid rgba(255,255,255,0.04); color: #cdcdcd; font-size: 13px; }

  .empty { font-size: 13px; color: #434345; padding: 4px 0; margin: 0; }

  .add-row { display: flex; gap: 8px; align-items: center; }

  .add-row input {
    flex: 1;
    padding: 7px 10px;
    background: #101111;
    color: #f4f4f6;
    border: 1px solid #242728;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.15s;
  }
  .add-row input:focus { border-color: rgba(255,184,0,0.4); }
  .add-row input::placeholder { color: #434345; }

  .btn-primary {
    padding: 7px 16px;
    background: #FFB800;
    color: #000;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 0.15s;
  }
  .btn-primary:hover { background: #FFC933; }

  .btn-ghost {
    padding: 5px 12px;
    font-size: 12px;
    font-family: inherit;
    background: transparent;
    color: #9c9c9d;
    border: 1px solid #242728;
    border-radius: 6px;
    cursor: pointer;
    flex-shrink: 0;
    transition: color 0.15s, border-color 0.15s;
  }
  .btn-ghost:hover { color: #f4f4f6; border-color: rgba(255,255,255,0.16); }

  .btn-ghost-red {
    padding: 4px 10px;
    font-size: 12px;
    font-family: inherit;
    background: transparent;
    color: #ff6161;
    border: 1px solid rgba(255,97,97,0.35);
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-ghost-red:hover { background: rgba(255,97,97,0.08); }

  .del {
    padding: 3px 10px;
    font-size: 12px;
    font-family: inherit;
    background: transparent;
    color: #ff6161;
    border: 1px solid rgba(255,97,97,0.35);
    border-radius: 5px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .del:hover { background: rgba(255,97,97,0.1); }

  .hint { font-size: 12px; color: #6a6b6c; margin: 0; line-height: 1.5; }
  .error { font-size: 12px; color: #ff6161; margin: 0; }

  .save-bar { display: flex; justify-content: flex-end; padding-top: 8px; }

  .btn-save {
    padding: 9px 28px;
    background: #FFB800;
    color: #000;
    border: none;
    border-radius: 9999px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .btn-save:hover { background: #FFC933; transform: scale(1.02); }
  .btn-save:active { transform: scale(0.98); }

  .history-header { display: flex; align-items: center; justify-content: space-between; }
  .history-count { font-size: 12px; color: #434345; }
  .history-list { display: flex; flex-direction: column; gap: 8px; }

  .history-item {
    padding: 12px 14px;
    background: #0d0e12;
    border: 1px solid #1e1f22;
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: border-color 0.15s;
  }
  .history-item:hover { border-color: rgba(255,255,255,0.1); }

  .history-meta { display: flex; align-items: center; justify-content: space-between; }
  .history-date { font-size: 11px; color: #434345; letter-spacing: 0.02em; }

  .copy-btn {
    background: transparent;
    border: none;
    color: #FFB800;
    font-size: 14px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
    transition: opacity 0.15s;
  }
  .copy-btn:hover { opacity: 0.7; }

  .history-text {
    font-size: 13px;
    color: #9c9c9d;
    margin: 0;
    line-height: 1.6;
    font-style: italic;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    min-height: 200px;
    color: #434345;
    text-align: center;
    font-size: 13px;
    line-height: 1.6;
  }
  .empty-icon { font-size: 32px; opacity: 0.4; }

  .voice-list { display: flex; flex-direction: column; gap: 2px; }

  .voice-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    background: #0d0e12;
    border: 1px solid #1e1f22;
    border-radius: 8px;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .voice-row:hover { border-color: rgba(255,255,255,0.1); }
  .voice-row.active { border-color: rgba(255,184,0,0.4); }
  .voice-row input[type='radio'] { accent-color: #FFB800; flex-shrink: 0; }

  .voice-info { display: flex; flex-direction: column; gap: 2px; }
  .voice-label { font-size: 13px; color: #f4f4f6; font-weight: 500; }
  .voice-meta { font-size: 11px; color: #6a6b6c; }

  .tts-select-row { display: flex; gap: 10px; flex-wrap: wrap; }

  .tts-select-group { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 160px; }

  .tts-select-label { font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #6a6b6c; }

  .tts-select {
    padding: 8px 10px;
    background: #0d0e12;
    color: #f4f4f6;
    border: 1px solid #242728;
    border-radius: 8px;
    font-size: 13px;
    font-family: inherit;
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s;
  }
  .tts-select:focus { border-color: rgba(255,184,0,0.4); }

  .instructions-group { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; }
  .tts-instructions {
    background: #111214;
    border: 1px solid #2a2b2e;
    border-radius: 6px;
    color: #cdcdcd;
    font-family: inherit;
    font-size: 13px;
    padding: 8px 10px;
    resize: vertical;
    width: 100%;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .tts-instructions:focus { border-color: rgba(255,184,0,0.4); outline: none; }

  code {
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 12px;
    background: #1e1f22;
    padding: 1px 5px;
    border-radius: 3px;
    color: #FFB800;
  }

  :global(::-webkit-scrollbar) { width: 4px; }
  :global(::-webkit-scrollbar-track) { background: transparent; }
  :global(::-webkit-scrollbar-thumb) { background: #2a2b30; border-radius: 9999px; }
</style>
