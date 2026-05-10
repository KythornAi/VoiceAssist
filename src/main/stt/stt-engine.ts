export interface SttEngine {
  start(): Promise<void>
  transcribe(chunks: Float32Array[]): Promise<string>
  stop(): void
}
