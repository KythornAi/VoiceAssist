import { safeStorage, app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'

const OPENAI_KEY = 'openai'

export class SecretStore {
  private readonly filepath: string
  private ciphers: Record<string, string>

  constructor() {
    this.filepath = join(app.getPath('userData'), 'secrets.json')
    this.ciphers = this.load()
  }

  private load(): Record<string, string> {
    try {
      if (!existsSync(this.filepath)) return {}
      return JSON.parse(readFileSync(this.filepath, 'utf8')) as Record<string, string>
    } catch {
      return {}
    }
  }

  private save(): void {
    mkdirSync(join(app.getPath('userData')), { recursive: true })
    writeFileSync(this.filepath, JSON.stringify(this.ciphers, null, 2), 'utf8')
  }

  setOpenAIKey(key: string): void {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('System encryption not available — cannot store API key securely')
    }
    this.ciphers = { ...this.ciphers, [OPENAI_KEY]: safeStorage.encryptString(key).toString('base64') }
    this.save()
  }

  hasOpenAIKey(): boolean {
    return OPENAI_KEY in this.ciphers
  }

  getOpenAIKey(): string | null {
    if (!this.hasOpenAIKey()) return null
    try {
      return safeStorage.decryptString(Buffer.from(this.ciphers[OPENAI_KEY], 'base64'))
    } catch {
      return null
    }
  }

  clearOpenAIKey(): void {
    const { [OPENAI_KEY]: _removed, ...rest } = this.ciphers
    this.ciphers = rest
    this.save()
  }
}
