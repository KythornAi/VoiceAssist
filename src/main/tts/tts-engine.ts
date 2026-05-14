import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import log from '../logger'
import { checkPiperReady, synthesise } from './piper-sidecar'
import * as say from './say-speaker'
import { synthesise as openAiSynthesize, NoApiKeyError } from './providers/openai-cloud'
import type { JsonStore } from '../store/json-store'
import type { TtsSettings } from '../../shared/types'

const logger = log.scope('tts-engine')

let ttsSettingsStore: JsonStore<TtsSettings> | null = null
let getApiKey: (() => string | null) | null = null

export function init(store: JsonStore<TtsSettings>, apiKeyGetter: () => string | null): void {
  ttsSettingsStore = store
  getApiKey = apiKeyGetter
}

export type TtsState = 'idle' | 'speaking'

type StateCallback = (state: TtsState) => void

const tmpWav = path.join(tmpdir(), 'voiceassist-tts.wav')
let activePlayback: ChildProcess | null = null
let stateCallback: StateCallback | null = null

export function onStateChange(cb: StateCallback): void {
  stateCallback = cb
}

function setState(state: TtsState): void {
  stateCallback?.(state)
}

export function isSpeaking(): boolean {
  return say.isSpeaking() || activePlayback !== null
}

export function stop(): void {
  say.stop()
  if (activePlayback) {
    activePlayback.kill()
    activePlayback = null
  }
  setState('idle')
}

type AfplayOutcome = 'done' | 'stopped' | 'error'

async function playWav(wavPath: string): Promise<AfplayOutcome> {
  return new Promise<AfplayOutcome>((resolve) => {
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

async function playViaPiper(text: string, voiceFile?: string, speed = 1.0): Promise<AfplayOutcome> {
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
        logger.warn('afplay failed for OpenAI TTS, falling back to local')
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
      logger.warn('afplay failed, falling back to say')
    } catch (err) {
      logger.warn('Piper synthesis failed, falling back to say', err)
    }
  }

  await say.speak(text)
  setState('idle')
}
