#!/usr/bin/env node

/**
 * Downloads whisper.cpp binary (platform-specific) and the base.en model.
 * Run: node scripts/download-whisper.js
 *
 * For macOS: downloads source and compiles (no pre-built CLI binaries available).
 * For Windows: downloads pre-built binary from GitHub releases.
 * Model: downloads ggml-base.en.bin from Hugging Face to resources/models/.
 */

import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import os from 'os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BIN_DIR = path.join(ROOT, 'resources', 'bin')
const MODEL_DIR = path.join(ROOT, 'resources', 'models')

const WHISPER_VERSION = 'v1.8.3'
const WHISPER_REPO = 'https://github.com/ggml-org/whisper.cpp'
const WHISPER_WIN_URL = `https://github.com/ggml-org/whisper.cpp/releases/download/${WHISPER_VERSION}/whisper-bin-x64.zip`

// Supported models and their Hugging Face URLs
const MODELS = {
    'base.en': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    'small.en': 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin',
}

// Parse CLI args: node download-whisper.js [model-name]
// If no arg, downloads base.en only. Pass "small.en" or "all" for more.
const requestedModel = process.argv[2] || 'base.en'

fs.mkdirSync(BIN_DIR, { recursive: true })
fs.mkdirSync(MODEL_DIR, { recursive: true })

function download(url, dest) {
    return new Promise((resolve, reject) => {
        console.log(`Downloading: ${url}`)
        console.log(`        To: ${dest}`)

        const file = fs.createWriteStream(dest)

        function follow(u) {
            const parsed = new URL(u)
            const get = parsed.protocol === 'https:' ? https.get : http.get
            get(parsed, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    const next = new URL(res.headers.location, u).href
                    follow(next)
                    return
                }
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode} for ${u}`))
                    return
                }

                const total = parseInt(res.headers['content-length'], 10) || 0
                let downloaded = 0
                let lastPct = -1

                res.on('data', (chunk) => {
                    downloaded += chunk.length
                    if (total > 0) {
                        const pct = Math.floor((downloaded / total) * 100)
                        if (pct !== lastPct && pct % 10 === 0) {
                            console.log(`  ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)`)
                            lastPct = pct
                        }
                    }
                })

                res.pipe(file)
                file.on('finish', () => { file.close(); resolve() })
                file.on('error', reject)
            }).on('error', reject)
        }

        follow(url)
    })
}

async function downloadModel(modelName) {
    const url = MODELS[modelName]
    if (!url) {
        console.error(`Unknown model: "${modelName}". Available: ${Object.keys(MODELS).join(', ')}`)
        process.exit(1)
    }
    const modelPath = path.join(MODEL_DIR, `ggml-${modelName}.bin`)
    if (fs.existsSync(modelPath)) {
        const size = fs.statSync(modelPath).size
        if (size > 50_000_000) {
            console.log(`Model ${modelName} already downloaded (${(size / 1024 / 1024).toFixed(0)} MB), skipping.`)
            return
        }
    }
    console.log(`\nDownloading model: ${modelName}`)
    await download(url, modelPath)
    console.log(`Model ${modelName} download complete.`)
}

async function downloadWindowsBinary() {
    const zipPath = path.join(BIN_DIR, 'whisper-bin-x64.zip')
    await download(WHISPER_WIN_URL, zipPath)

    console.log('Extracting Windows binary...')
    // Use PowerShell to extract on Windows, or unzip on Unix (for cross-dev)
    try {
        execSync(`unzip -o "${zipPath}" -d "${BIN_DIR}"`, { stdio: 'inherit' })
    } catch {
        // Try PowerShell if unzip not available
        execSync(`powershell -Command "Expand-Archive -Force '${zipPath}' '${BIN_DIR}'"`, { stdio: 'inherit' })
    }
    fs.unlinkSync(zipPath)
    console.log('Windows binary ready.')
}

async function compileMacBinary() {
    const whisperCliPath = path.join(BIN_DIR, 'whisper-cli')
    if (fs.existsSync(whisperCliPath)) {
        console.log('whisper-cli already exists, skipping compilation.')
        return
    }

    const tmpDir = path.join(os.tmpdir(), 'whisper-cpp-build')
    const srcDir = path.join(tmpDir, 'whisper.cpp')

    console.log('Cloning whisper.cpp...')
    if (fs.existsSync(srcDir)) {
        execSync(`rm -rf "${srcDir}"`)
    }
    fs.mkdirSync(tmpDir, { recursive: true })
    execSync(`git clone --depth 1 --branch ${WHISPER_VERSION} ${WHISPER_REPO} "${srcDir}"`, { stdio: 'inherit' })

    console.log('Building whisper-cli with static linking (this may take a minute)...')
    execSync(`cmake -B build -DWHISPER_METAL=ON -DBUILD_SHARED_LIBS=OFF`, { cwd: srcDir, stdio: 'inherit' })
    execSync(`cmake --build build --config Release -j${Math.max(1, os.cpus().length - 1)}`, { cwd: srcDir, stdio: 'inherit' })

    // Copy the binary
    const builtBinary = path.join(srcDir, 'build', 'bin', 'whisper-cli')
    if (!fs.existsSync(builtBinary)) {
        throw new Error(`Build succeeded but binary not found at ${builtBinary}`)
    }
    fs.copyFileSync(builtBinary, whisperCliPath)
    fs.chmodSync(whisperCliPath, 0o755)

    // Copy Metal shader support file if present
    const metalLib = path.join(srcDir, 'build', 'bin', 'ggml-metal.metal')
    if (fs.existsSync(metalLib)) {
        fs.copyFileSync(metalLib, path.join(BIN_DIR, 'ggml-metal.metal'))
    }
    const defaultMetal = path.join(srcDir, 'build', 'bin', 'default.metallib')
    if (fs.existsSync(defaultMetal)) {
        fs.copyFileSync(defaultMetal, path.join(BIN_DIR, 'default.metallib'))
    }

    // Cleanup
    execSync(`rm -rf "${srcDir}"`)
    console.log('macOS binary ready.')
}

async function main() {
    console.log('=== VoiceAssist: whisper.cpp setup ===\n')

    // Download model(s)
    if (requestedModel === 'all') {
        for (const name of Object.keys(MODELS)) {
            await downloadModel(name)
        }
    } else {
        await downloadModel(requestedModel)
    }

    // Platform-specific binary
    if (process.platform === 'darwin') {
        await compileMacBinary()
    } else if (process.platform === 'win32') {
        await downloadWindowsBinary()
    } else {
        console.log(`Platform "${process.platform}" not supported. You may need to compile whisper.cpp manually.`)
        console.log(`Place the binary at: ${path.join(BIN_DIR, 'whisper-cli')}`)
    }

    console.log('\n=== Setup complete! ===')
}

main().catch((err) => {
    console.error('Setup failed:', err)
    process.exit(1)
})
