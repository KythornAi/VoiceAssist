import { encodeWav } from '../audio-utils'
import type { SttEngine } from '../stt-engine'
import log from '../../logger'

const logger = log.scope('openai-cloud')
const TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions'

export class NoApiKeyError extends Error {
  constructor() {
    super('OpenAI API key not set')
    this.name = 'NoApiKeyError'
  }
}

export class ApiError extends Error {
  constructor(public readonly status: number, body: string) {
    super(`OpenAI API error ${status}: ${body}`)
    this.name = 'ApiError'
  }
}

export class OpenAiCloudSttEngine implements SttEngine {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly getVocabEntries: () => Record<string, string>,
  ) {}

  async start(): Promise<void> {
    // no-op — no server to start for cloud provider
  }

  async transcribe(chunks: Float32Array[]): Promise<string> {
    const wavBuffer = encodeWav(chunks)
    const blob = new Blob([new Uint8Array(wavBuffer)], { type: 'audio/wav' })
    const form = new FormData()
    form.append('file', blob, 'audio.wav')
    form.append('model', this.model)
    form.append('response_format', 'json')

    const vocabKeys = Object.keys(this.getVocabEntries())
    if (vocabKeys.length > 0) {
      form.append('prompt', vocabKeys.join(', '))
    }

    const response = await fetch(TRANSCRIPTION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    })

    if (!response.ok) {
      const body = await response.text()
      throw new ApiError(response.status, body)
    }

    const json = await response.json() as { text: string }
    logger.info('Cloud transcription complete', { chars: json.text.length })
    return json.text
  }

  stop(): void {
    // no-op
  }
}
