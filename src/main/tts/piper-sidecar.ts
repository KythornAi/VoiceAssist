import { spawn, execSync } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import log from '../logger'
import type { VoiceInfo } from '../../shared/types'

export type { VoiceInfo }

const logger = log.scope('piper')

export interface PiperStatus {
  ready: boolean
  missingBinary: boolean
  missingVoices: boolean
  binaryPath: string
  voicesDir: string
  voices: VoiceInfo[]
}

export interface SynthesiseOptions {
  voice?: string
  speed?: number
}

const MALE_VOICES = new Set(['joe', 'norman', 'alan', 'northern_english_male', 'ryan', 'danny', 'john', 'sam', 'bryce', 'hfc_male', 'kusal', 'reza_ibrahim'])
const FEMALE_VOICES = new Set(['amy', 'alba', 'cori', 'kathleen', 'kristin', 'jenny_dioco', 'southern_english_female', 'hfc_female', 'ljspeech'])

let cachedPiperPath: string | null = null

function getBinaryPath(): string {
  if (cachedPiperPath) return cachedPiperPath

  const binName = process.platform === 'win32' ? 'piper.exe' : 'piper'

  if (process.platform === 'darwin') {
    const home = process.env.HOME ?? ''
    const pythonPaths = [
      path.join(home, 'Library/Python/3.9/bin/piper'),
      path.join(home, 'Library/Python/3.11/bin/piper'),
      path.join(home, 'Library/Python/3.12/bin/piper'),
      path.join(home, 'Library/Python/3.13/bin/piper'),
      '/opt/homebrew/bin/piper',
      '/usr/local/bin/piper',
    ]
    for (const p of pythonPaths) {
      if (fs.existsSync(p)) {
        logger.info('Using Python piper', { path: p })
        cachedPiperPath = p
        return p
      }
    }
    try {
      const result = execSync('which piper 2>/dev/null', { encoding: 'utf8' }).trim()
      if (result && fs.existsSync(result)) {
        logger.info('Using piper from PATH', { path: result })
        cachedPiperPath = result
        return result
      }
    } catch { /* fall through to bundled binary */ }
  }

  const binBase = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), 'resources')
  cachedPiperPath = path.join(binBase, 'bin', binName)
  return cachedPiperPath
}

function getVoicesDir(): string {
  const base = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), 'resources')
  return path.join(base, 'voices')
}

function parseVoiceFile(filename: string): VoiceInfo {
  const name = filename.replace('.onnx', '')
  const firstDash = name.indexOf('-')
  const lastDash = name.lastIndexOf('-')
  const lang = name.slice(0, firstDash)
  const voice = name.slice(firstDash + 1, lastDash)
  const quality = name.slice(lastDash + 1)
  const gender = MALE_VOICES.has(voice) ? 'male' : FEMALE_VOICES.has(voice) ? 'female' : 'unknown'
  const prettyVoice = voice.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
  const region = lang.includes('GB') ? 'UK' : lang.includes('US') ? 'US' : lang
  return { id: name, file: filename, lang, voice, quality, gender, label: `${prettyVoice} - ${region} (${gender})` }
}

export function listVoices(): VoiceInfo[] {
  const dir = getVoicesDir()
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.onnx'))
    .map(parseVoiceFile)
    .sort((a, b) => {
      if (a.gender === b.gender) return a.voice.localeCompare(b.voice)
      if (a.gender === 'male') return -1
      if (b.gender === 'male') return 1
      return 0
    })
}

function getDefaultVoice(voices: VoiceInfo[]): string | null {
  if (voices.length === 0) return null
  return (voices.find(v => v.lang === 'en_GB') ?? voices.find(v => v.lang.startsWith('en')) ?? voices[0]).file
}

export function checkPiperReady(): PiperStatus {
  const binaryPath = getBinaryPath()
  const voicesDir = getVoicesDir()
  const voices = listVoices()
  return {
    ready: fs.existsSync(binaryPath) && voices.length > 0,
    missingBinary: !fs.existsSync(binaryPath),
    missingVoices: voices.length === 0,
    binaryPath,
    voicesDir,
    voices,
  }
}

export function synthesise(text: string, options: SynthesiseOptions = {}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const binaryPath = getBinaryPath()
    const voicesDir = getVoicesDir()
    const voices = listVoices()
    const voiceFile = options.voice ?? getDefaultVoice(voices)

    if (!voiceFile) {
      reject(new Error('No Piper voice models found. Run "npm run download:piper" to set up.'))
      return
    }
    if (!fs.existsSync(binaryPath)) {
      reject(new Error(`Piper binary not found at ${binaryPath}. Run "npm run download:piper".`))
      return
    }

    const modelPath = path.join(voicesDir, voiceFile)
    if (!fs.existsSync(modelPath)) {
      reject(new Error(`Piper voice model not found at ${modelPath}. Run "npm run download:piper".`))
      return
    }

    // length_scale = 1 / speed (lower = faster)
    const speed = options.speed ?? 1.0
    const lengthScale = Math.max(0.3, Math.min(3.0, 1.0 / speed))

    const args = ['--model', modelPath, '--output_file', '-', '--length_scale', lengthScale.toFixed(2)]
    const binDir = path.dirname(binaryPath)
    if (fs.existsSync(path.join(binDir, 'espeak-ng-data'))) {
      args.push('--data-dir', binDir)
    }

    logger.info('Synthesising', { chars: text.length, voice: voiceFile })

    const proc = spawn(binaryPath, args, { stdio: ['pipe', 'pipe', 'pipe'], cwd: binDir })
    const chunks: Buffer[] = []
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => chunks.push(chunk))
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString() })
    proc.on('error', (err) => reject(new Error(`Failed to start piper: ${err.message}`)))
    proc.on('close', (code) => {
      if (code !== 0) {
        logger.error('piper exited non-zero', { code, stderr: stderr.slice(0, 200) })
        reject(new Error(`piper exited with code ${code}: ${stderr.slice(0, 200)}`))
        return
      }
      const wav = Buffer.concat(chunks)
      logger.info('Synthesised', { kb: (wav.length / 1024).toFixed(0) })
      resolve(wav)
    })

    proc.stdin.write(text)
    proc.stdin.end()
  })
}
