import type { AudioChunkPayload } from '@shared/ipc-contract'

const SAMPLE_RATE = 16000

// Inlined as a Blob URL so it works in both dev and packaged Electron
// without any file-path resolution concerns.
const WORKLET_CODE = `
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this._active = true
    this.port.onmessage = (e) => {
      if (e.data === 'stop') this._active = false
    }
  }
  process(inputs) {
    if (!this._active) return false
    const channel = inputs[0]?.[0]
    if (channel && channel.length > 0) {
      this.port.postMessage(channel.slice(0))
    }
    return true
  }
}
registerProcessor('recorder-processor', RecorderProcessor)
`

export interface AudioCaptureOptions {
  microphone?: string
  onChunk: (payload: AudioChunkPayload) => void
  onError: (message: string) => void
}

export interface AudioCapture {
  stop: () => Promise<void>
}

export async function startCapture(
  sessionId: string,
  options: AudioCaptureOptions,
): Promise<AudioCapture> {
  const audioConstraints: MediaTrackConstraints = {
    sampleRate: SAMPLE_RATE,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }
  if (options.microphone && options.microphone !== 'default') {
    audioConstraints.deviceId = { exact: options.microphone }
  }

  let stream!: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })
  } catch {
    if (audioConstraints.deviceId) {
      const { deviceId: _id, ...fallback } = audioConstraints
      stream = await navigator.mediaDevices.getUserMedia({ audio: fallback })
    } else {
      options.onError('Microphone access denied.')
      throw new Error('Microphone access denied.')
    }
  }

  const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE })
  const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' })
  const processorUrl = URL.createObjectURL(blob)
  await audioCtx.audioWorklet.addModule(processorUrl)
  URL.revokeObjectURL(processorUrl)

  const source = audioCtx.createMediaStreamSource(stream)
  const processor = new AudioWorkletNode(audioCtx, 'recorder-processor')

  let seq = 0
  processor.port.onmessage = (e: MessageEvent<Float32Array>) => {
    options.onChunk({ sessionId, seq: seq++, buffer: e.data.buffer.slice(0) as ArrayBuffer })
  }

  source.connect(processor)
  processor.connect(audioCtx.destination)

  stream.getAudioTracks().forEach(track => {
    track.onended = () => stop()
  })

  async function stop(): Promise<void> {
    processor.port.postMessage('stop')
    await new Promise<void>(r => setTimeout(r, 150))
    processor.disconnect()
    source.disconnect()
    stream.getTracks().forEach(t => t.stop())
    await audioCtx.close()
  }

  return { stop }
}
