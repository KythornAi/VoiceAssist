import fs from 'fs'
import os from 'os'
import path from 'path'

const LEADING_PAD_SAMPLES = 16000  // 1s at 16 kHz — prevents Whisper first-word miss
const TRAILING_PAD_SAMPLES = 3200  // 200ms clean tail — whisper closes gracefully
const VAD_WINDOW = 800             // 50ms windows for silence detection
const VAD_THRESHOLD = 0.01         // RMS below this = silence (~-40 dBFS)

function rmsEnergy(samples: Float32Array, start: number, end: number): number {
  let sum = 0
  for (let i = start; i < end; i++) sum += samples[i] * samples[i]
  return Math.sqrt(sum / (end - start))
}

// Trim trailing silence from combined audio so Whisper doesn't hallucinate
// filler words ("yeah", "okay", "thank you") into the quiet tail.
function trimTrailingSilence(samples: Float32Array): Float32Array {
  let trimEnd = samples.length
  while (trimEnd - VAD_WINDOW > LEADING_PAD_SAMPLES) {
    if (rmsEnergy(samples, trimEnd - VAD_WINDOW, trimEnd) > VAD_THRESHOLD) break
    trimEnd -= VAD_WINDOW
  }
  const result = new Float32Array(trimEnd + TRAILING_PAD_SAMPLES)
  result.set(samples.subarray(0, trimEnd))
  return result
}

export function encodeWav(chunks: Float32Array[]): Buffer {
  const totalSamples = chunks.reduce((sum, c) => sum + c.length, 0)
  const raw = new Float32Array(LEADING_PAD_SAMPLES + totalSamples)
  let offset = LEADING_PAD_SAMPLES
  for (const chunk of chunks) {
    raw.set(chunk, offset)
    offset += chunk.length
  }
  const combined = trimTrailingSilence(raw)

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
