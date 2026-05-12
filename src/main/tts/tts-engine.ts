import { spawn } from 'node:child_process'
import type { ChildProcess } from 'node:child_process'
import { tmpdir } from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import log from '../logger'
import { checkPiperReady, synthesise } from './piper-sidecar'
import * as say from './say-speaker'

const logger = log.scope('tts-engine')

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

async function playViaPiper(text: string, voiceFile?: string): Promise<AfplayOutcome> {
  const wav = await synthesise(text, voiceFile ? { voice: voiceFile } : {})
  fs.writeFileSync(tmpWav, wav)
  return new Promise<AfplayOutcome>((resolve) => {
    activePlayback = spawn('afplay', [tmpWav])
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

export async function speak(text: string, voiceFile?: string): Promise<void> {
  stop()
  setState('speaking')

  const piper = checkPiperReady()
  if (piper.ready) {
    try {
      const outcome = await playViaPiper(text, voiceFile)
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
