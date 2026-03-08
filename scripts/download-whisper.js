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
const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin'

fs.mkdirSync(BIN_DIR, { recursive: true })
fs.mkdirSync(MODEL_DIR, { recursive: true })

function download(url, dest) {
    return new Promise((resolve, reject) => {
        console.log(`Downloading: ${url}`)
        console.log(`        To: ${dest}`)

        const file = fs.createWriteStream(dest)
        const get = url.startsWith('https') ? https.get : http.get

        function follow(u) {
            get(u, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    follow(res.headers.location)
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

async function downloadModel() {
    const modelPath = path.join(MODEL_DIR, 'ggml-base.en.bin')
    if (fs.existsSync(modelPath)) {
        const size = fs.statSync(modelPath).size
        if (size > 100_000_000) {
            console.log('Model already downloaded, skipping.')
            return
        }
    }
    await download(MODEL_URL, modelPath)
    console.log('Model download complete.')
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

    console.log('Building whisper-cli (this may take a minute)...')
    execSync(`cmake -B build -DWHISPER_METAL=ON`, { cwd: srcDir, stdio: 'inherit' })
    execSync(`cmake --build build --config Release -j${Math.max(1, os.cpus().length - 1)}`, { cwd: srcDir, stdio: 'inherit' })

    // Copy the binary
    const builtBinary = path.join(srcDir, 'build', 'bin', 'whisper-cli')
    if (!fs.existsSync(builtBinary)) {
        throw new Error(`Build succeeded but binary not found at ${builtBinary}`)
    }
    fs.copyFileSync(builtBinary, whisperCliPath)
    fs.chmodSync(whisperCliPath, 0o755)

    // Cleanup
    execSync(`rm -rf "${srcDir}"`)
    console.log('macOS binary ready.')
}

async function main() {
    console.log('=== VoiceAssist: whisper.cpp setup ===\n')

    // Download model (all platforms)
    await downloadModel()

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
