import fs from 'fs'
import os from 'os'
import path from 'path'

const SILENCE_PAD_SAMPLES = 4800 // 300ms at 16 kHz — prevents Whisper first-word mis-transcription

export function encodeWav(chunks: Float32Array[]): Buffer {
  const totalSamples = chunks.reduce((sum, c) => sum + c.length, 0)
  const combined = new Float32Array(SILENCE_PAD_SAMPLES + totalSamples)
  let offset = SILENCE_PAD_SAMPLES // first 4800 samples stay zero (silence)
  for (const chunk of chunks) {
    combined.set(chunk, offset)
    offset += chunk.length
  }

  const int16 = new Int16Array(combined.length)
  for (let i = 0; i < combined.length; i++) {
    const s = Math.max(-1, Math.min(1, combined[i]))
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }

  const sampleRate = 16000
  const bitsPerSample = 16
  const dataSize = int16.length * 2

  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + dataSize, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * (bitsPerSample / 8), 28)
  header.writeUInt16LE(bitsPerSample / 8, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(dataSize, 40)

  return Buffer.concat([header, Buffer.from(int16.buffer)])
}

export function writeTempWav(chunks: Float32Array[]): string {
  const wavPath = path.join(os.tmpdir(), `voiceassist-${Date.now()}.wav`)
  fs.writeFileSync(wavPath, encodeWav(chunks))
  return wavPath
}

export function deleteTempFile(filePath: string): void {
  try {
    fs.unlinkSync(filePath)
  } catch {
    // file may already be gone
  }
}
