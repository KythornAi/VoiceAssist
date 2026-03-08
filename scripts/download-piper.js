#!/usr/bin/env node

/**
 * Downloads Piper TTS binary (platform-specific) and default voice models.
 * Run: node scripts/download-piper.js
 */

import https from 'https'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import os from 'os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const BIN_DIR = path.join(ROOT, 'resources', 'bin')
const VOICES_DIR = path.join(ROOT, 'resources', 'voices')

const PIPER_VERSION = '2023.11.14-2'
const BASE_URL = `https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}`

const PLATFORM_ARCHIVES = {
    'darwin-arm64': `${BASE_URL}/piper_macos_aarch64.tar.gz`,
    'darwin-x64': `${BASE_URL}/piper_macos_x64.tar.gz`,
    'win32-x64': `${BASE_URL}/piper_windows_amd64.zip`,
}

// Default voices -- one UK, one US
const VOICES = [
    {
        name: 'en_GB-alba-medium',
        onnx: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_GB/alba/medium/en_GB-alba-medium.onnx',
        json: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_GB/alba/medium/en_GB-alba-medium.onnx.json',
    },
    {
        name: 'en_US-amy-medium',
        onnx: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx',
        json: 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/amy/medium/en_US-amy-medium.onnx.json',
    },
]

fs.mkdirSync(BIN_DIR, { recursive: true })
fs.mkdirSync(VOICES_DIR, { recursive: true })

function download(url, dest) {
    return new Promise((resolve, reject) => {
        console.log(`Downloading: ${url}`)
        console.log(`        To: ${dest}`)

        const file = fs.createWriteStream(dest)

        function follow(u) {
            const get = u.startsWith('https') ? https.get : https.get
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

async function downloadBinary() {
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
    const key = `${process.platform}-${arch}`
    const url = PLATFORM_ARCHIVES[key]

    if (!url) {
        console.log(`No pre-built Piper binary for ${key}. You may need to compile manually.`)
        return
    }

    const piperBin = path.join(BIN_DIR, process.platform === 'win32' ? 'piper.exe' : 'piper')
    if (fs.existsSync(piperBin)) {
        console.log('Piper binary already exists, skipping.')
        return
    }

    const ext = url.endsWith('.zip') ? '.zip' : '.tar.gz'
    const archivePath = path.join(BIN_DIR, `piper${ext}`)

    await download(url, archivePath)

    console.log('Extracting Piper binary...')
    const tmpExtract = path.join(BIN_DIR, '_piper_extract')
    fs.mkdirSync(tmpExtract, { recursive: true })

    if (ext === '.tar.gz') {
        execSync(`tar -xzf "${archivePath}" -C "${tmpExtract}"`, { stdio: 'inherit' })
    } else {
        try {
            execSync(`unzip -o "${archivePath}" -d "${tmpExtract}"`, { stdio: 'inherit' })
        } catch {
            execSync(`powershell -Command "Expand-Archive -Force '${archivePath}' '${tmpExtract}'"`, { stdio: 'inherit' })
        }
    }

    // Find the piper binary in extracted contents
    const binName = process.platform === 'win32' ? 'piper.exe' : 'piper'
    const candidates = []
    function findBin(dir) {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) findBin(full)
            else if (entry.name === binName) candidates.push(full)
        }
    }
    findBin(tmpExtract)

    if (candidates.length === 0) {
        throw new Error(`Could not find ${binName} in extracted archive`)
    }

    // Copy the piper binary and any .so/.dylib files it needs
    const piperDir = path.dirname(candidates[0])
    for (const file of fs.readdirSync(piperDir)) {
        const src = path.join(piperDir, file)
        const dest = path.join(BIN_DIR, file)
        if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, dest)
            // Make binaries executable
            if (file === binName || file.endsWith('.so') || file.endsWith('.dylib')) {
                fs.chmodSync(dest, 0o755)
            }
        }
    }

    // Cleanup
    fs.unlinkSync(archivePath)
    fs.rmSync(tmpExtract, { recursive: true, force: true })
    console.log('Piper binary ready.')
}

async function downloadVoices() {
    for (const voice of VOICES) {
        const onnxPath = path.join(VOICES_DIR, `${voice.name}.onnx`)
        const jsonPath = path.join(VOICES_DIR, `${voice.name}.onnx.json`)

        if (fs.existsSync(onnxPath) && fs.statSync(onnxPath).size > 1_000_000) {
            console.log(`Voice ${voice.name} already downloaded, skipping.`)
            continue
        }

        console.log(`\nDownloading voice: ${voice.name}`)
        await download(voice.onnx, onnxPath)
        await download(voice.json, jsonPath)
        console.log(`Voice ${voice.name} ready.`)
    }
}

async function main() {
    console.log('=== VoiceAssist: Piper TTS setup ===\n')
    await downloadBinary()
    await downloadVoices()
    console.log('\n=== Piper setup complete! ===')
}

main().catch((err) => {
    console.error('Setup failed:', err)
    process.exit(1)
})
