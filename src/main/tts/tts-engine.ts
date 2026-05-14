import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import log from '../logger'
import { checkPiperReady, synthesise } from './piper-sidecar'
import * as say from './say-speaker'
import { synthesise as openAiSynthesize, NoApiKeyError } from './providers/openai-cloud'
import type { JsonStore } from '../store/json-store'
import type { TtsSettings } from '../../shared/types'
import { IPC } from '../../shared/ipc-contract'

const logger = log.scope('tts-engine')

let ttsSettingsStore: JsonStore<TtsSettings> | null = null
let getApiKey: (() => string | null) | null = null
let getControlStrip: (() => BrowserWindow | null) | null = null

export function init(
  store: JsonStore<TtsSettings>,
  apiKeyGetter: () => string | null,
  windowGetter: () => BrowserWindow | null,
): void {
  ttsSettingsStore = store
  getApiKey = apiKeyGetter
  getControlStrip = windowGetter
}

export type TtsState = 'idle' | 'speaking'

type StateCallback = (state: TtsState) => void

const tmpWav = path.join(tmpdir(), 'voiceassist-tts.wav')
let activePlayback: ChildProcess | null = null
let rendererPlaying = false
let stateCallback: StateCallback | null = null

export function onStateChange(cb: StateCallback): void {
  stateCallback = cb
}

function setState(state: TtsState): void {
  stateCallback?.(state)
}

export function isSpeaking(): boolean {
  return say.isSpeaking() || activePlayback !== null || rendererPlaying
}

export function stop(): void {
  say.stop()
  if (activePlayback) {
    activePlayback.kill()
    activePlayback = null
  }
  if (rendererPlaying) {
    const win = getControlStrip?.()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC.TTS_STOP_WAV)
    }
  }
  setState('idle')
}

type PlayOutcome = 'done' | 'stopped' | 'error'

async function playWavViaAfplay(wavPath: string): Promise<PlayOutcome> {
  return new Promise<PlayOutcome>((resolve) => {
    activePlayback = spawn('afplay', [wavPath])
    activePlayback.on('close', (_code, signal) => {
      activePlayback = null
      resolve(signal ? 'stopped' : 'done')
    })
    activePlayback.on('error', (err) => {
      logger.warn('afplay error', err)
      activePlayback = null
      resolve('error')
    })
  })
}

async function playWavViaRenderer(wavPath: string): Promise<PlayOutcome> {
  const win = getControlStrip?.()
  if (!win || win.isDestroyed()) {
    logger.warn('No renderer window available for WAV playback')
    return 'error'
  }
  const w = win
  return new Promise<PlayOutcome>((resolve) => {
    rendererPlaying = true
    const wavData = fs.readFileSync(wavPath)
    const buf = wavData.buffer.slice(wavData.byteOffset, wavData.byteOffset + wavData.byteLength)

    function onDone(_event: unknown, outcome: string): void {
      rendererPlaying = false
      ;(w as NodeJS.EventEmitter).removeListener('destroyed', onDestroyed)
      resolve(outcome === 'stopped' ? 'stopped' : outcome === 'error' ? 'error' : 'done')
    }

    function onDestroyed(): void {
      ipcMain.removeListener(IPC.TTS_PLAY_DONE, onDone)
      rendererPlaying = false
      resolve('error')
    }

    ipcMain.once(IPC.TTS_PLAY_DONE, onDone)
    ;(w as NodeJS.EventEmitter).once('destroyed', onDestroyed)
    w.webContents.send(IPC.TTS_PLAY_WAV, buf)
  })
}

async function playWav(wavPath: string): Promise<PlayOutcome> {
  if (process.platform === 'darwin') {
    return playWavViaAfplay(wavPath)
  }
  return playWavViaRenderer(wavPath)
}

async function playViaPiper(text: string, voiceFile?: string, speed = 1.0): Promise<PlayOutcome> {
  const wav = await synthesise(text, { ...(voiceFile ? { voice: voiceFile } : {}), speed })
  fs.writeFileSync(tmpWav, wav)
  return playWav(tmpWav)
}

export async function speak(text: string, voiceFile?: string): Promise<void> {
  stop()
  setState('speaking')

  const speed = ttsSettingsStore?.get('speed') ?? 1.0
  const instructions = ttsSettingsStore?.get('instructions') ?? ''

  if (ttsSettingsStore?.get('provider') === 'openai') {
    const key = getApiKey?.() ?? null
    if (!key) {
      logger.warn('OpenAI TTS selected but no API key set — falling back to local')
    } else {
      try {
        const model = ttsSettingsStore.get('model')
        const voice = ttsSettingsStore.get('voice')
        const wavPath = await openAiSynthesize(text, key, model, voice, speed, instructions)
        const outcome = await playWav(wavPath)
        if (outcome !== 'error') {
          setState('idle')
          return
        }
        logger.warn('playWav failed for OpenAI TTS, falling back to local')
      } catch (err) {
        if (err instanceof NoApiKeyError) {
          logger.warn('OpenAI TTS: no API key, falling back to local')
        } else {
          logger.warn('OpenAI TTS synthesis failed, falling back to local', err)
        }
      }
    }
  }

  const piper = checkPiperReady()
  if (piper.ready) {
    try {
      const outcome = await playViaPiper(text, voiceFile, speed)
      if (outcome !== 'error') {
        setState('idle')
        return
      }
      logger.warn('Piper playback failed, falling back to say')
    } catch (err) {
      logger.warn('Piper synthesis failed, falling back to say', err)
    }
  }

  if (process.platform === 'darwin') {
    await say.speak(text)
  } else {
    logger.warn('No TTS fallback available on this platform')
  }
  setState('idle')
}
