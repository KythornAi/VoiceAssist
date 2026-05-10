import type { SttEngine } from './stt-engine'
import { WhisperSttEngine } from './providers/whisper-local'
import { OpenAiCloudSttEngine, NoApiKeyError } from './providers/openai-cloud'
import type { JsonStore } from '../store/json-store'
import type { SecretStore } from '../store/secret-store'
import type { SttSettings } from '../../shared/types'
import log from '../logger'

const logger = log.scope('stt-router')

export class SttRouter implements SttEngine {
  private readonly whisper = new WhisperSttEngine()
  private activeEngine: SttEngine | null = null

  constructor(
    private readonly sttSettings: JsonStore<SttSettings>,
    private readonly secrets: SecretStore,
    private readonly getVocabEntries: () => Record<string, string>,
  ) {}

  async start(): Promise<void> {
    const { provider, model } = this.sttSettings.getAll()

    if (provider === 'openai') {
      const key = this.secrets.getOpenAIKey()
      if (!key) throw new NoApiKeyError()
      this.activeEngine = new OpenAiCloudSttEngine(key, model, this.getVocabEntries)
    } else {
      this.activeEngine = this.whisper
    }

    await this.activeEngine.start()
    logger.info('STT engine started', { provider })
  }

  async transcribe(chunks: Float32Array[]): Promise<string> {
    if (!this.activeEngine) throw new Error('SttRouter: transcribe called before start')
    return this.activeEngine.transcribe(chunks)
  }

  stop(): void {
    this.activeEngine?.stop()
  }
}
