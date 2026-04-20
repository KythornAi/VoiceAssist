// @ts-nocheck — runs in AudioWorklet scope; registerProcessor/AudioWorkletProcessor are not Window globals
class RecorderProcessor extends AudioWorkletProcessor {
  private active = true

  constructor() {
    super()
    this.port.onmessage = (e: MessageEvent<string>) => {
      if (e.data === 'stop') this.active = false
    }
  }

  process(
    inputs: Float32Array[][],
    _outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>,
  ): boolean {
    if (!this.active) return false
    const channel = inputs[0]?.[0]
    if (channel && channel.length > 0) {
      this.port.postMessage(channel.slice(0))
    }
    return true
  }
}

registerProcessor('recorder-processor', RecorderProcessor)
