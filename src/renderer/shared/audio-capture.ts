import processorUrl from './audio-worklet-processor.ts?url'
import type { AudioChunkPayload } from '@shared/ipc-contract'

const SAMPLE_RATE = 16000

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
  await audioCtx.audioWorklet.addModule(processorUrl)

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
