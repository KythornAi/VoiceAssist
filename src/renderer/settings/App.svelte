<script lang="ts">
  import { onMount } from 'svelte'
  import type { PolishSettings, SttSettings } from '../../shared/types'

  let settings: PolishSettings = {
    locale: 'uk',
    fixSpelling: true,
    fixGrammar: true,
    removeFillerWords: true,
    pasteAtCursor: true,
  }

  let sttSettings: SttSettings = { provider: 'local', model: 'gpt-4o-mini-transcribe' }
  let hasKey = false
  let keyInput = ''
  let keySaving = false
  let keySaved = false
  let keyError = ''

  let vocab: Record<string, string> = {}
  let newKey = ''
  let newValue = ''
  let saving = false
  let saved = false
  let addError = ''

  onMount(async () => {
    settings = await window.api.getSettings()
    sttSettings = await window.api.getSttSettings()
    hasKey = await window.api.hasOpenAIKey()
    vocab = await window.api.getVocab()
  })

  async function setProvider(provider: 'local' | 'openai') {
    sttSettings = { ...sttSettings, provider }
    await window.api.setSttSettings({ provider })
  }

  async function saveKey() {
    const k = keyInput.trim()
    if (!k) { keyError = 'Key cannot be empty.'; return }
    if (k.startsWith('sk-or-')) { keyError = 'That looks like an OpenRouter key, not an OpenAI key. Get yours at platform.openai.com/api-keys.'; return }
    if (!k.startsWith('sk-')) { keyError = 'OpenAI keys start with sk-'; return }
    keyError = ''
    keySaving = true
    await window.api.setOpenAIKey(k)
    hasKey = true
    keyInput = ''
    keySaving = false
    keySaved = true
    setTimeout(() => { keySaved = false }, 1500)
  }

  async function clearKey() {
    await window.api.clearOpenAIKey()
    hasKey = false
  }

  async function saveSettings() {
    saving = true
    await window.api.setSettings(settings)
    saving = false
    saved = true
    setTimeout(() => { saved = false }, 1500)
  }

  async function addEntry() {
    addError = ''
    const k = newKey.trim().toLowerCase()
    const v = newValue.trim()
    if (!k) { addError = 'Word cannot be empty.'; return }
    if (!v) { addError = 'Replacement cannot be empty.'; return }
    await window.api.setVocabEntry(k, v)
    vocab = { ...vocab, [k]: v }
    newKey = ''
    newValue = ''
  }

  async function deleteEntry(key: string) {
    await window.api.deleteVocabEntry(key)
    const { [key]: _removed, ...rest } = vocab
    vocab = rest
  }
</script>

<main>
  <section>
    <h2>Speech Recognition</h2>

    <div class="provider-row">
      <button
        class="provider-btn"
        class:active={sttSettings.provider === 'local'}
        on:click={() => setProvider('local')}
      >
        Local (Whisper)
      </button>
      <button
        class="provider-btn"
        class:active={sttSettings.provider === 'openai'}
        on:click={() => setProvider('openai')}
      >
        OpenAI Cloud
      </button>
    </div>

    {#if sttSettings.provider === 'local'}
      <p class="hint">Using on-device Whisper. Works offline. No API key needed.</p>
    {:else}
      <p class="hint">Uses gpt-4o-mini-transcribe. Requires an OpenAI API key. ~$0.003/min.</p>

      {#if hasKey}
        <div class="key-row">
          <span class="key-status">Key saved ✓</span>
          <button class="btn-ghost" on:click={clearKey}>Clear key</button>
        </div>
      {:else}
        <div class="key-warning">No API key set — cloud transcription will fail until a key is added.</div>
        <div class="add-row">
          <input
            type="password"
            bind:value={keyInput}
            placeholder="sk-..."
          />
          <button on:click={saveKey} disabled={keySaving}>
            {keySaved ? 'Saved ✓' : keySaving ? 'Saving...' : 'Save key'}
          </button>
        </div>
        {#if keyError}<p class="error">{keyError}</p>{/if}
      {/if}
    {/if}
  </section>

  <section>
    <h2>Text Polish</h2>

    <label class="field">
      <span>Spelling region</span>
      <select bind:value={settings.locale}>
        <option value="uk">UK English (colour, behaviour)</option>
        <option value="us">US English (color, behavior)</option>
      </select>
    </label>

    <label class="toggle-row">
      <span>
        <strong>Fix spelling</strong>
        <small>Correct common misspellings in dictated text</small>
      </span>
      <input type="checkbox" bind:checked={settings.fixSpelling} />
    </label>

    <label class="toggle-row">
      <span>
        <strong>Grammar cleanup</strong>
        <small>Auto-capitalise, fix spacing, add missing full stops</small>
      </span>
      <input type="checkbox" bind:checked={settings.fixGrammar} />
    </label>

    <label class="toggle-row">
      <span>
        <strong>Remove filler words</strong>
        <small>Filter out "um", "ah", "like" from dictated text</small>
      </span>
      <input type="checkbox" bind:checked={settings.removeFillerWords} />
    </label>

    <label class="toggle-row">
      <span>
        <strong>Paste at cursor automatically</strong>
        <small>Insert transcribed text wherever your cursor is (macOS only)</small>
      </span>
      <input type="checkbox" bind:checked={settings.pasteAtCursor} />
    </label>

    <button on:click={saveSettings} disabled={saving}>
      {saved ? 'Saved' : saving ? 'Saving...' : 'Save'}
    </button>
  </section>

  <section>
    <h2>Custom Vocabulary</h2>
    <p class="hint">Add words Whisper gets wrong. Applied after text polish.</p>

    {#if Object.keys(vocab).length > 0}
      <table>
        <thead>
          <tr><th>Spoken word</th><th>Replace with</th><th></th></tr>
        </thead>
        <tbody>
          {#each Object.entries(vocab) as [key, value] (key)}
            <tr>
              <td>{key}</td>
              <td>{value}</td>
              <td><button class="del" on:click={() => deleteEntry(key)}>Delete</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p class="empty">No custom words yet.</p>
    {/if}

    <div class="add-row">
      <input bind:value={newKey} placeholder="Spoken word" />
      <input bind:value={newValue} placeholder="Replace with" />
      <button on:click={addEntry}>Add</button>
    </div>
    {#if addError}<p class="error">{addError}</p>{/if}
  </section>
</main>

<style>
  main {
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 32px;
    color: var(--text, #e2e8f0);
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    font-size: 14px;
  }

  h2 {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 16px;
    color: var(--text, #e2e8f0);
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .field span {
    color: var(--text-secondary, #94a3b8);
  }

  select {
    background: var(--surface, #1e293b);
    color: var(--text, #e2e8f0);
    border: 1px solid var(--border, #334155);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 13px;
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: var(--surface, #1e293b);
    border: 1px solid var(--border, #334155);
    border-radius: 8px;
    cursor: pointer;
    gap: 12px;
  }

  .toggle-row span {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .toggle-row strong {
    font-weight: 500;
    color: var(--text, #e2e8f0);
  }

  .toggle-row small {
    font-size: 12px;
    color: var(--text-secondary, #94a3b8);
  }

  .toggle-row input[type='checkbox'] {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
    accent-color: var(--accent, #3b82f6);
  }

  button {
    align-self: flex-start;
    padding: 8px 20px;
    background: var(--accent, #3b82f6);
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }

  button:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .hint {
    font-size: 13px;
    color: var(--text-secondary, #94a3b8);
    margin: 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  th {
    text-align: left;
    padding: 8px 10px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-muted, #64748b);
    border-bottom: 1px solid var(--border, #334155);
  }

  td {
    padding: 9px 10px;
    border-bottom: 1px solid var(--border, #1e293b);
    color: var(--text, #e2e8f0);
  }

  button.del {
    padding: 4px 10px;
    font-size: 12px;
    background: transparent;
    color: var(--red, #ef4444);
    border: 1px solid var(--red, #ef4444);
    border-radius: 4px;
  }

  button.del:hover {
    background: rgba(239, 68, 68, 0.1);
  }

  .empty {
    font-size: 13px;
    color: var(--text-muted, #64748b);
    padding: 8px 0;
  }

  .add-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-top: 4px;
  }

  .add-row input {
    flex: 1;
    padding: 7px 10px;
    background: var(--surface, #1e293b);
    color: var(--text, #e2e8f0);
    border: 1px solid var(--border, #334155);
    border-radius: 6px;
    font-size: 13px;
  }

  .add-row input::placeholder {
    color: var(--text-muted, #64748b);
  }

  .add-row button {
    flex-shrink: 0;
    margin: 0;
  }

  .error {
    font-size: 12px;
    color: var(--red, #ef4444);
    margin: 0;
  }

  .provider-row {
    display: flex;
    gap: 8px;
  }

  .provider-btn {
    flex: 1;
    padding: 9px 14px;
    background: var(--surface, #1e293b);
    color: var(--text-secondary, #94a3b8);
    border: 1px solid var(--border, #334155);
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    align-self: unset;
  }

  .provider-btn.active {
    background: var(--accent, #3b82f6);
    color: white;
    border-color: var(--accent, #3b82f6);
  }

  .key-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .key-status {
    font-size: 13px;
    color: #4ade80;
  }

  .btn-ghost {
    padding: 5px 12px;
    font-size: 12px;
    background: transparent;
    color: var(--text-secondary, #94a3b8);
    border: 1px solid var(--border, #334155);
    border-radius: 4px;
    align-self: unset;
  }

  .btn-ghost:hover {
    color: var(--red, #ef4444);
    border-color: var(--red, #ef4444);
  }

  .key-warning {
    font-size: 12px;
    color: #fb923c;
    padding: 8px 12px;
    background: rgba(251, 146, 60, 0.1);
    border: 1px solid rgba(251, 146, 60, 0.3);
    border-radius: 6px;
  }
</style>
