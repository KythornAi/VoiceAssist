<script lang="ts">
  import { startCapture } from '../shared/audio-capture'
  import type { AudioCapture } from '../shared/audio-capture'
  import type { FormatMode, TtsState } from '../../shared/types'

  let sessionId = $state<string | null>(null)
  let capture = $state<AudioCapture | null>(null)
  let status = $state('idle')
  let formatMode = $state<FormatMode>('note')
  let audioDeviceId = $state('')
  let copied = $state(false)
  let copiedTimer: ReturnType<typeof setTimeout> | null = null
  let errorMessage = $state<string | null>(null)
  let errorTimer: ReturnType<typeof setTimeout> | null = null
  let ttsState = $state<TtsState>('idle')
  let recordingSeconds = $state(0)
  let timerInterval: ReturnType<typeof setInterval> | null = null

  $effect(() => {
    void window.api.getSettings().then(s => {
      formatMode = s.formatMode ?? 'note'
      audioDeviceId = s.audioDeviceId ?? ''
    })
  })

  function showError(msg: string) {
    if (errorTimer) clearTimeout(errorTimer)
    errorMessage = msg
    errorTimer = setTimeout(() => { errorMessage = null }, 4000)
  }

  function startTimer() {
    recordingSeconds = 0
    timerInterval = setInterval(() => { recordingSeconds++ }, 1000)
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
  }

  function formatTime(s: number): string {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  $effect(() => {
    return window.api.onTranscript(() => {
      if (copiedTimer) clearTimeout(copiedTimer)
      copied = true
      copiedTimer = setTimeout(() => { copied = false }, 2000)
    })
  })

  $effect(() => {
    return window.api.onSessionError((payload) => {
      showError(payload.message)
    })
  })

  $effect(() => {
    return window.api.onTtsState((state) => {
      ttsState = state
    })
  })

  $effect(() => {
    return window.api.onHotkeyToggle(() => {
      if (status === 'idle') void onStart()
      else if (status === 'recording') onStop()
    })
  })

  async function onStart() {
    const s = await window.api.getSettings()
    formatMode = s.formatMode ?? 'note'
    audioDeviceId = s.audioDeviceId ?? ''
    try {
      const result = await window.api.startSession(formatMode)
      sessionId = result.sessionId
      status = 'recording'
      startTimer()
      capture = await startCapture(sessionId, {
        microphone: audioDeviceId || undefined,
        onChunk: (payload) => window.api.sendAudioChunk(payload),
        onError: (msg) => {
          const sid = sessionId
          sessionId = null
          capture = null
          status = 'idle'
          stopTimer()
          if (sid) void window.api.cancelSession(sid)
          showError(msg)
        },
      })
    } catch (err) {
      const sid = sessionId
      sessionId = null
      capture = null
      status = 'idle'
      stopTimer()
      if (sid) void window.api.cancelSession(sid)
      showError(err instanceof Error ? err.message : String(err))
    }
  }

  async function onStopRecording() {
    if (!sessionId || !capture) return
    stopTimer()
    try {
      await capture.stop()
      await window.api.stopSession(sessionId)
    } finally {
      sessionId = null
      capture = null
      status = 'idle'
    }
  }

  function onStop() {
    if (ttsState === 'speaking') {
      void window.api.stopSpeech()
      return
    }
    if (status === 'recording') void onStopRecording()
  }
</script>

<div class="pill">
  {#if status === 'recording'}
    <div class="waveform">
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
    </div>
    <span class="timer">{formatTime(recordingSeconds)}</span>
    <button class="btn-stop" onclick={onStop}>Stop</button>
  {:else if ttsState === 'speaking'}
    <span class="speaking-dot"></span>
    <span class="reading-label">Reading</span>
    <button class="btn-stop" onclick={onStop}>Stop</button>
  {:else}
    <button class="btn-start" onclick={() => void onStart()}>Start</button>
    <button class="btn-read" onclick={() => void window.api.ttsRead()} title="Read selected text (Ctrl+R)">Read</button>
    <button class="btn-icon" onclick={() => window.api.openSettings()} title="Settings">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
    </button>
  {/if}
</div>

{#if copied}
  <div class="toast toast-success">Copied</div>
{/if}
{#if errorMessage}
  <div class="toast toast-error">{errorMessage}</div>
{/if}

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: transparent;
  }

  .pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    margin: 8px;
    background: #121317;
    border: 1px solid #2a2b30;
    border-radius: 22px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.7);
    -webkit-app-region: drag;
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    font-size: 13px;
    min-height: 44px;
  }

  button {
    -webkit-app-region: no-drag;
    font-family: inherit;
    cursor: pointer;
    transition: opacity 0.15s, background 0.15s;
    white-space: nowrap;
  }

  .btn-start {
    padding: 6px 16px;
    background: #FFB800;
    color: #000;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
  }
  .btn-start:hover { background: #FFC933; }

  .btn-read {
    padding: 6px 14px;
    background: transparent;
    color: #9c9d9e;
    border: 1px solid #2a2b30;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 400;
  }
  .btn-read:hover { color: #e3e2e7; border-color: #444548; }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    color: #5a5b5c;
    border: none;
    border-radius: 6px;
    padding: 0;
  }
  .btn-icon:hover { background: rgba(255,255,255,0.07); color: #a0a1a2; }

  /* Waveform */
  .waveform {
    display: flex;
    align-items: center;
    gap: 3px;
    height: 24px;
    -webkit-app-region: no-drag;
  }

  .bar {
    display: block;
    width: 3px;
    border-radius: 2px;
    background: #FFB800;
    transform-origin: center;
    animation: wave 0.9s ease-in-out infinite;
  }

  .bar:nth-child(1) { height: 10px; animation-delay: 0.00s; }
  .bar:nth-child(2) { height: 18px; animation-delay: 0.12s; }
  .bar:nth-child(3) { height: 24px; animation-delay: 0.06s; }
  .bar:nth-child(4) { height: 16px; animation-delay: 0.18s; }
  .bar:nth-child(5) { height: 22px; animation-delay: 0.03s; }
  .bar:nth-child(6) { height: 14px; animation-delay: 0.15s; }
  .bar:nth-child(7) { height: 8px;  animation-delay: 0.09s; }

  @keyframes wave {
    0%, 100% { transform: scaleY(0.35); opacity: 0.6; }
    50%       { transform: scaleY(1);   opacity: 1;   }
  }

  .timer {
    font-size: 13px;
    font-weight: 600;
    color: #FFB800;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    -webkit-app-region: no-drag;
  }

  .btn-stop {
    padding: 6px 14px;
    background: transparent;
    color: #e3e2e7;
    border: 1px solid #2a2b30;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 400;
  }
  .btn-stop:hover { background: rgba(255,255,255,0.07); }

  /* TTS speaking */
  .speaking-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #FFB800;
    flex-shrink: 0;
    animation: pulse 1.3s ease-in-out infinite;
    -webkit-app-region: no-drag;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.35; transform: scale(0.7); }
  }

  .reading-label {
    font-size: 13px;
    color: #FFB800;
    font-weight: 500;
    -webkit-app-region: no-drag;
  }

  /* Toasts */
  .toast {
    margin: 0 8px 6px;
    padding: 4px 10px;
    border-radius: 6px;
    font-family: 'Inter', -apple-system, system-ui, sans-serif;
    font-size: 12px;
    font-weight: 500;
    text-align: right;
  }

  .toast-success {
    background: rgba(89,212,153,0.12);
    border: 1px solid rgba(89,212,153,0.25);
    color: #59d499;
  }

  .toast-error {
    background: rgba(255,97,97,0.1);
    border: 1px solid rgba(255,97,97,0.25);
    color: #ff6161;
  }
</style>
