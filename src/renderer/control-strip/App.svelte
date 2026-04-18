<script lang="ts">
  import { startCapture } from '../shared/audio-capture'
  import type { AudioCapture } from '../shared/audio-capture'

  let sessionId = $state<string | null>(null)
  let capture = $state<AudioCapture | null>(null)
  let chunkCount = $state<number | null>(null)
  let status = $state('idle')

  async function onStart() {
    try {
      const result = await window.api.startSession()
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
  <span class="status">{status}</span>
  {#if status === 'idle'}
    <button onclick={onStart}>Start</button>
  {:else if status === 'recording'}
    <button onclick={onStop}>Stop</button>
  {/if}
  {#if chunkCount !== null}
    <span class="chunks">Chunks: {chunkCount}</span>
  {/if}
</div>

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
  }

  .status {
    flex: 1;
    color: var(--text-secondary, #8899A6);
  }

  .chunks {
    font-size: 12px;
    color: var(--green, #22C55E);
  }
</style>
