import { spawn, execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

/**
 * Piper TTS sidecar -- spawns the native piper binary to synthesise speech.
 * Pipes text via stdin, receives WAV audio on stdout.
 * Returns a Buffer containing the WAV data.
 */

let _cachedPiperPath = null

function getBinaryPath() {
    if (_cachedPiperPath) return _cachedPiperPath

    const platform = process.platform
    const binName = platform === 'win32' ? 'piper.exe' : 'piper'

    // On macOS, prefer the Python piper-tts (native binary has missing dylibs).
    // Check in both dev and packaged mode -- the native macOS release is incomplete.
    if (platform === 'darwin') {
        // Check common Python bin locations first
        const home = process.env.HOME || ''
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
                console.log('[piper] Using Python piper at:', p)
                _cachedPiperPath = p
                return _cachedPiperPath
            }
        }

        // Try which (may not work in packaged app due to PATH)
        try {
            const result = execSync('which piper 2>/dev/null', { encoding: 'utf8' }).trim()
            if (result && fs.existsSync(result)) {
                console.log('[piper] Using piper from PATH:', result)
                _cachedPiperPath = result
                return _cachedPiperPath
            }
        } catch { /* fall through to native binary */ }
    }

    // Native binary (works on Windows, fallback on macOS)
    if (app.isPackaged) {
        _cachedPiperPath = path.join(process.resourcesPath, 'bin', binName)
    } else {
        _cachedPiperPath = path.join(app.getAppPath(), 'resources', 'bin', binName)
    }
    return _cachedPiperPath
}

function getVoicesDir() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'voices')
    }
    return path.join(app.getAppPath(), 'resources', 'voices')
}

/**
 * List available voice models (looks for .onnx files in voices dir).
 */
export function listVoices() {
    const dir = getVoicesDir()
    if (!fs.existsSync(dir)) return []

    // Known voice genders (bundled voices)
    const MALE_VOICES = ['joe', 'norman', 'alan', 'northern_english_male', 'ryan', 'danny', 'john', 'sam', 'bryce', 'hfc_male', 'kusal', 'reza_ibrahim']
    const FEMALE_VOICES = ['amy', 'alba', 'cori', 'kathleen', 'kristin', 'jenny_dioco', 'southern_english_female', 'hfc_female', 'ljspeech']

    return fs.readdirSync(dir)
        .filter(f => f.endsWith('.onnx'))
        .map(f => {
            const name = f.replace('.onnx', '')
            // Parse: en_GB-alba-medium or en_GB-northern_english_male-medium
            const firstDash = name.indexOf('-')
            const lastDash = name.lastIndexOf('-')
            const lang = name.slice(0, firstDash)
            const voice = name.slice(firstDash + 1, lastDash)
            const quality = name.slice(lastDash + 1)

            const gender = MALE_VOICES.includes(voice) ? 'male'
                : FEMALE_VOICES.includes(voice) ? 'female'
                : 'unknown'

            // Pretty label: "Alan" or "Northern English Male"
            const prettyVoice = voice.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
            const region = lang.includes('GB') ? 'UK' : lang.includes('US') ? 'US' : lang

            return {
                id: name,
                file: f,
                lang,
                voice,
                quality,
                gender,
                label: `${prettyVoice} - ${region} (${gender})`,
            }
        })
        // Sort: males first, then females, then by name
        .sort((a, b) => {
            if (a.gender === b.gender) return a.voice.localeCompare(b.voice)
            if (a.gender === 'male') return -1
            if (b.gender === 'male') return 1
            return 0
        })
}

/**
 * Synthesise text to WAV audio using Piper TTS.
 *
 * @param {string} text - The text to speak
 * @param {object} options
 * @param {string} options.voice - Voice model filename (e.g. 'en_GB-alba-medium.onnx')
 * @param {number} options.speed - Speed multiplier (1.0 = normal). Maps to length_scale (inverted: lower = faster).
 * @returns {Promise<Buffer>} WAV audio data
 */
export function synthesise(text, options = {}) {
    return new Promise((resolve, reject) => {
        const binaryPath = getBinaryPath()
        const voicesDir = getVoicesDir()
        const voiceFile = options.voice || getDefaultVoice()

        if (!voiceFile) {
            reject(new Error('No Piper voice models found. Run "npm run download:piper" to set up.'))
            return
        }

        const modelPath = path.join(voicesDir, voiceFile)

        if (!fs.existsSync(binaryPath)) {
            reject(new Error(
                `Piper binary not found at ${binaryPath}. ` +
                'Run "npm run download:piper" to download it.'
            ))
            return
        }

        if (!fs.existsSync(modelPath)) {
            reject(new Error(
                `Piper voice model not found at ${modelPath}. ` +
                'Run "npm run download:piper" to download it.'
            ))
            return
        }

        // Piper uses length_scale where lower = faster.
        // User speed: 1.0 = normal, 1.5 = faster, 0.5 = slower
        // Piper length_scale: 1.0 = normal, 0.67 = faster, 2.0 = slower
        // Conversion: length_scale = 1 / speed
        const speed = options.speed || 1.0
        const lengthScale = Math.max(0.3, Math.min(3.0, 1.0 / speed))

        const args = [
            '--model', modelPath,
            '--output_file', '-',
            '--length_scale', String(lengthScale.toFixed(2)),
        ]

        // For the native piper binary, point it to the espeak-ng-data directory
        // (Python piper handles this internally, but the native binary needs it)
        const binDir = path.dirname(binaryPath)
        const espeakDataDir = path.join(binDir, 'espeak-ng-data')
        if (fs.existsSync(espeakDataDir)) {
            args.push('--data-dir', binDir)
        }

        console.log('[piper] Synthesising:', text.slice(0, 80) + (text.length > 80 ? '...' : ''))

        const proc = spawn(binaryPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: binDir, // Set working directory to bin dir so piper can find its DLLs
        })

        const chunks = []
        let stderr = ''

        proc.stdout.on('data', (chunk) => chunks.push(chunk))
        proc.stderr.on('data', (chunk) => { stderr += chunk.toString() })

        proc.on('error', (err) => {
            reject(new Error('Failed to start piper: ' + err.message))
        })

        proc.on('close', (code) => {
            if (code !== 0) {
                console.error('[piper] stderr:', stderr)
                reject(new Error(`piper exited with code ${code}: ${stderr.slice(0, 200)}`))
                return
            }

            const wavBuffer = Buffer.concat(chunks)
            console.log('[piper] Generated', (wavBuffer.length / 1024).toFixed(0), 'KB of audio')
            resolve(wavBuffer)
        })

        // Pipe text to stdin and close
        proc.stdin.write(text)
        proc.stdin.end()
    })
}

/**
 * Get the default voice model filename.
 * Prefers en_GB voices (UK), then falls back to first available.
 */
function getDefaultVoice() {
    const voices = listVoices()
    if (voices.length === 0) return null

    // Prefer UK English
    const uk = voices.find(v => v.lang === 'en_GB')
    if (uk) return uk.file

    // Then any English
    const en = voices.find(v => v.lang.startsWith('en'))
    if (en) return en.file

    // Fallback to first
    return voices[0].file
}

/**
 * Check if Piper binary and at least one voice are available.
 */
export function checkPiperReady() {
    const binaryExists = fs.existsSync(getBinaryPath())
    const voices = listVoices()
    return {
        ready: binaryExists && voices.length > 0,
        missingBinary: !binaryExists,
        missingVoices: voices.length === 0,
        binaryPath: getBinaryPath(),
        voicesDir: getVoicesDir(),
        voices,
    }
}
