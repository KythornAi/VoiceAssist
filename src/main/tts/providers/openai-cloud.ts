import { tmpdir } from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import log from '../../logger'

const logger = log.scope('openai-tts')
const SPEECH_URL = 'https://api.openai.com/v1/audio/speech'

export class NoApiKeyError extends Error {
  constructor() {
    super('OpenAI API key not set')
    this.name = 'NoApiKeyError'
  }
}

export class ApiError extends Error {
  constructor(public readonly status: number, body: string) {
    super(`OpenAI TTS API error ${status}: ${body}`)
    this.name = 'ApiError'
  }
}

const tmpWav = path.join(tmpdir(), 'voiceassist-tts-openai.wav')

export async function synthesise(text: string, apiKey: string, model: string, voice: string): Promise<string> {
  const response = await fetch(SPEECH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: text, voice, response_format: 'wav' }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new ApiError(response.status, body)
  }

  const buffer = await response.arrayBuffer()
  fs.writeFileSync(tmpWav, Buffer.from(buffer))
  logger.info('OpenAI TTS synthesis complete', { chars: text.length, model, voice })
  return tmpWav
}
