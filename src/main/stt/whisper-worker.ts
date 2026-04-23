import { spawn, type ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import log from '../logger'

const logger = log.scope('whisper-worker')
const SERVER_PORT = 8765
const HEALTH_POLL_MS = 200
const HEALTH_TIMEOUT_MS = 45_000

function getBinaryPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bin', 'whisper-server')
  }
  return '/opt/homebrew/bin/whisper-server'
}

function getModelPath(): string {
  const model = 'ggml-large-v3-turbo-q5_0.bin'
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'models', model)
  }
  return path.join(app.getAppPath(), 'resources', 'models', model)
}

async function waitForServer(port: number): Promise<void> {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      await fetch(`http://127.0.0.1:${port}/inference`, { method: 'GET' })
      return
    } catch {
      // ECONNREFUSED -- server not yet listening
    }
    await new Promise<void>(r => setTimeout(r, HEALTH_POLL_MS))
  }
  throw new Error(`whisper-server did not become ready within ${HEALTH_TIMEOUT_MS}ms`)
}

export class WhisperWorker {
  private proc: ChildProcess | null = null
  private readonly port = SERVER_PORT

  async start(): Promise<void> {
    const bin = getBinaryPath()
    const model = getModelPath()

    if (!fs.existsSync(bin)) {
      throw new Error(`whisper-server binary not found: ${bin}`)
    }
    if (!fs.existsSync(model)) {
      throw new Error(`Whisper model not found: ${model}`)
    }

    logger.info('Starting whisper-server', { port: this.port })

    this.proc = spawn(
      bin,
      ['-m', model, '--host', '127.0.0.1', '--port', String(this.port)],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    )

    this.proc.stdout?.on('data', (d: Buffer) => logger.debug('[whisper]', d.toString().trim()))
    this.proc.stderr?.on('data', (d: Buffer) => logger.debug('[whisper]', d.toString().trim()))
    this.proc.on('error', err => logger.error('whisper-server process error', err))
    this.proc.on('exit', (code, signal) => {
      logger.info('whisper-server exited', { code, signal })
      this.proc = null
    })

    await waitForServer(this.port)
    logger.info('whisper-server ready')
  }

  async transcribe(wavPath: string): Promise<string> {
    if (!this.proc) {
      throw new Error('whisper-server is not running')
    }

    const form = new FormData()
    const blob = new Blob([fs.readFileSync(wavPath)], { type: 'audio/wav' })
    form.append('file', blob, 'audio.wav')
    form.append('response_format', 'json')

    const res = await fetch(`http://127.0.0.1:${this.port}/inference`, {
      method: 'POST',
      body: form,
    })

    if (!res.ok) {
      throw new Error(`/inference returned ${res.status} ${res.statusText}`)
    }

    const json = await res.json() as { text: string }
    return json.text.trim()
  }

  stop(): void {
    if (this.proc) {
      logger.info('Stopping whisper-server')
      this.proc.kill('SIGTERM')
      this.proc = null
    }
  }

  isRunning(): boolean {
    return this.proc !== null
  }
}
