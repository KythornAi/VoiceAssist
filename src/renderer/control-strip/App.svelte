<script lang="ts">
  import { startCapture } from '../shared/audio-capture'
  import type { AudioCapture } from '../shared/audio-capture'
  import type { FormatMode } from '../../shared/types'

  const FORMAT_MODES: FormatMode[] = ['note', 'email', 'chat', 'terminal']

  let sessionId = $state<string | null>(null)
  let capture = $state<AudioCapture | null>(null)
  let chunkCount = $state<number | null>(null)
  let status = $state('idle')
  let formatMode = $state<FormatMode>('note')
  let lastTranscript = $state<string | null>(null)
  let copied = $state(false)
  let copiedTimer: ReturnType<typeof setTimeout> | null = null

  $effect(() => {
    return window.api.onTranscript((result) => {
      lastTranscript = result.text
      if (copiedTimer) clearTimeout(copiedTimer)
      copied = true
      copiedTimer = setTimeout(() => { copied = false }, 2000)
    })
  })

  $effect(() => {
    return window.api.onHotkeyToggle(() => {
      if (status === 'idle') onStart()
      else if (status === 'recording') void onStop()
    })
  })

  async function onStart() {
    try {
      const result = await window.api.startSession(formatMode)
      sessionId = result.sessionId
      status = 'recording'
      chunkCount = null
      capture = await startCapture(sessionId, {
        onChunk: (payload) => window.api.sendAudioChunk(payload),
        onError: (msg) => { status = `error: ${msg}` },
      })
    } catch (err) {
      status = `error: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  async function onStop() {
    if (!sessionId || !capture) return
    try {
      await capture.stop()
      const result = await window.api.stopSession(sessionId)
      chunkCount = result.chunks
    } finally {
      sessionId = null
      capture = null
      status = 'idle'
    }
  }
</script>

<div class="control-strip">
  <div class="status">
    {#if status === 'recording'}
      <span class="recording-dot"></span>
    {/if}
    {status}
  </div>
  {#if status === 'idle'}
    <div class="mode-picker">
      {#each FORMAT_MODES as mode}
        <button
          class="mode-btn"
          class:active={formatMode === mode}
          onclick={() => { formatMode = mode }}
        >{mode.charAt(0).toUpperCase() + mode.slice(1)}</button>
      {/each}
    </div>
    <button onclick={onStart}>Start</button>
  {:else if status === 'recording'}
    <span class="mode-label">{formatMode}</span>
    <button onclick={onStop}>Stop</button>
  {/if}
  {#if chunkCount !== null}
    <span class="chunks">Chunks: {chunkCount}</span>
  {/if}
  <button class="icon-btn" onclick={() => window.api.openHistory()} title="History">◷</button>
  <button class="icon-btn" onclick={() => window.api.openSettings()} title="Settings">⚙</button>
</div>
{#if lastTranscript}
  <div class="transcript">{lastTranscript}</div>
{/if}
{#if copied}
  <div class="copied-badge">Copied ✓</div>
{/if}

<style>
  .control-strip {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    margin: 8px;
    background: var(--surface, #151D26);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    border-radius: 12px;
    color: var(--text, #E8ECF1);
    font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    font-size: 13px;
    -webkit-app-region: drag;
  }

  button {
    -webkit-app-region: no-drag;
  }

  .status {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary, #8899A6);
  }

  .recording-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #EF4444;
    flex-shrink: 0;
    animation: pulse 1.2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.4; transform: scale(0.8); }
  }

  .copied-badge {
    margin: 0 8px 6px;
    padding: 4px 10px;
    background: rgba(34, 197, 94, 0.15);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 6px;
    color: #22C55E;
    font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    font-size: 12px;
    text-align: right;
  }

  .mode-picker {
    display: flex;
    gap: 4px;
  }

  .mode-btn {
    padding: 3px 8px;
    border-radius: 6px;
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    background: transparent;
    color: var(--text-secondary, #8899A6);
    font-size: 12px;
    cursor: pointer;
  }

  .mode-btn.active {
    background: var(--accent, #3B82F6);
    border-color: var(--accent, #3B82F6);
    color: #fff;
  }

  .mode-label {
    font-size: 12px;
    color: var(--text-secondary, #8899A6);
    text-transform: capitalize;
  }

  .chunks {
    font-size: 12px;
    color: var(--green, #22C55E);
  }

  .transcript {
    margin: 0 8px 8px;
    padding: 8px 12px;
    background: var(--surface, #151D26);
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
    border-radius: 8px;
    color: var(--text, #E8ECF1);
    font-family: -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
