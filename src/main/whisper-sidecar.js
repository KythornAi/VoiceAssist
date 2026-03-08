import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'
import { app } from 'electron'

/**
 * whisper.cpp sidecar -- spawns the native whisper-cli binary to transcribe audio.
 * Expects a Float32Array of 16kHz mono PCM audio.
 * Returns the transcript as a string.
 */

function getBinaryPath() {
    const platform = process.platform
    const binName = platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli'

    if (app.isPackaged) {
        // In packaged app, binaries are in resources/bin/ via extraFiles
        return path.join(process.resourcesPath, 'bin', binName)
    }
    // In dev, look in project resources/bin/
    return path.join(app.getAppPath(), 'resources', 'bin', binName)
}

function getModelPath() {
    if (app.isPackaged) {
        // In packaged app, model is bundled via extraFiles
        return path.join(process.resourcesPath, 'models', 'ggml-base.en.bin')
    }
    // In dev, look in project resources/models/
    return path.join(app.getAppPath(), 'resources', 'models', 'ggml-base.en.bin')
}

/**
 * Write a proper WAV file header + PCM data from a Float32Array.
 * whisper.cpp expects: 16-bit PCM, 16kHz, mono.
 */
function writeWav(filePath, float32Audio) {
    const sampleRate = 16000
    const numChannels = 1
    const bitsPerSample = 16

    // Convert Float32 [-1, 1] to Int16
    const int16 = new Int16Array(float32Audio.length)
    for (let i = 0; i < float32Audio.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Audio[i]))
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }

    const dataSize = int16.length * 2 // 2 bytes per Int16 sample
    const header = Buffer.alloc(44)

    // RIFF header
    header.write('RIFF', 0)
    header.writeUInt32LE(36 + dataSize, 4)
    header.write('WAVE', 8)

    // fmt chunk
    header.write('fmt ', 12)
    header.writeUInt32LE(16, 16) // chunk size
    header.writeUInt16LE(1, 20)  // PCM format
    header.writeUInt16LE(numChannels, 22)
    header.writeUInt32LE(sampleRate, 24)
    header.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28) // byte rate
    header.writeUInt16LE(numChannels * bitsPerSample / 8, 32) // block align
    header.writeUInt16LE(bitsPerSample, 34)

    // data chunk
    header.write('data', 36)
    header.writeUInt32LE(dataSize, 40)

    const pcmBuffer = Buffer.from(int16.buffer)
    const wav = Buffer.concat([header, pcmBuffer])
    fs.writeFileSync(filePath, wav)
}

/**
 * Transcribe a Float32Array of 16kHz mono audio using whisper.cpp.
 * Returns a Promise that resolves to the transcript string.
 */
export function transcribe(float32Audio, language = 'en') {
    return new Promise((resolve, reject) => {
        const binaryPath = getBinaryPath()
        const modelPath = getModelPath()

        // Check binary exists
        if (!fs.existsSync(binaryPath)) {
            reject(new Error(
                `whisper-cli binary not found at ${binaryPath}. ` +
                'Run "npm run download:whisper" to download it.'
            ))
            return
        }

        // Check model exists
        if (!fs.existsSync(modelPath)) {
            reject(new Error(
                `Whisper model not found at ${modelPath}. ` +
                'Run "npm run download:whisper" to download it.'
            ))
            return
        }

        // Write audio to temp WAV file
        const tmpDir = os.tmpdir()
        const wavPath = path.join(tmpDir, `voiceassist-${Date.now()}.wav`)
        try {
            writeWav(wavPath, float32Audio)
        } catch (err) {
            reject(new Error('Failed to write temp WAV file: ' + err.message))
            return
        }

        const args = [
            '-m', modelPath,
            '-f', wavPath,
            '-l', language,
            '--no-timestamps',
            '--no-prints',
            '-t', String(Math.max(1, Math.min(os.cpus().length - 1, 4))), // use up to 4 threads
        ]

        console.log('[whisper] Spawning:', binaryPath, args.join(' '))

        let stdout = ''
        let stderr = ''

        const proc = spawn(binaryPath, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 30000, // 30 second timeout
        })

        proc.stdout.on('data', (chunk) => { stdout += chunk.toString() })
        proc.stderr.on('data', (chunk) => { stderr += chunk.toString() })

        proc.on('error', (err) => {
            cleanup(wavPath)
            reject(new Error('Failed to start whisper-cli: ' + err.message))
        })

        proc.on('close', (code) => {
            cleanup(wavPath)

            if (code !== 0) {
                console.error('[whisper] stderr:', stderr)
                reject(new Error(`whisper-cli exited with code ${code}: ${stderr.slice(0, 200)}`))
                return
            }

            const transcript = stdout.trim()
            console.log('[whisper] Transcript:', transcript)
            resolve(transcript)
        })
    })
}

function cleanup(filePath) {
    try { fs.unlinkSync(filePath) } catch { /* ignore */ }
}

/**
 * Check if whisper.cpp binary and model are available.
 * Returns { ready: boolean, missingBinary: boolean, missingModel: boolean }
 */
export function checkWhisperReady() {
    const binaryExists = fs.existsSync(getBinaryPath())
    const modelExists = fs.existsSync(getModelPath())
    return {
        ready: binaryExists && modelExists,
        missingBinary: !binaryExists,
        missingModel: !modelExists,
        binaryPath: getBinaryPath(),
        modelPath: getModelPath(),
    }
}
