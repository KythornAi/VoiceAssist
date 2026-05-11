import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { IPC, type WindowApi, type TranscriptResult, type SessionErrorPayload } from '../shared/ipc-contract'
import type { SessionState, PolishSettings, SttSettings, FormatMode, TtsState } from '../shared/types'

const api: WindowApi = {
  ping: () =>
    ipcRenderer.invoke(IPC.APP_PING),

  startSession: (formatMode: FormatMode) =>
    ipcRenderer.invoke(IPC.SESSION_START, { formatMode }),

  stopSession: (sessionId) =>
    ipcRenderer.invoke(IPC.SESSION_STOP, { sessionId }),

  cancelSession: (sessionId) =>
    ipcRenderer.invoke(IPC.SESSION_CANCEL, { sessionId }),

  sendAudioChunk: (payload) => {
    ipcRenderer.send(IPC.AUDIO_CHUNK, payload)
  },

  onSessionState: (cb) => {
    const handler = (_: IpcRendererEvent, state: SessionState) => cb(state)
    ipcRenderer.on(IPC.SESSION_STATE, handler)
    return () => ipcRenderer.removeListener(IPC.SESSION_STATE, handler)
  },

  onTranscript: (cb) => {
    const handler = (_: IpcRendererEvent, result: TranscriptResult) => cb(result)
    ipcRenderer.on(IPC.SESSION_TRANSCRIPT, handler)
    return () => ipcRenderer.removeListener(IPC.SESSION_TRANSCRIPT, handler)
  },

  openSettings: () =>
    ipcRenderer.invoke(IPC.OPEN_SETTINGS),

  openHistory: () =>
    ipcRenderer.invoke(IPC.OPEN_HISTORY),

  getSettings: () =>
    ipcRenderer.invoke(IPC.SETTINGS_GET),

  setSettings: (patch: Partial<PolishSettings>) =>
    ipcRenderer.invoke(IPC.SETTINGS_SET, patch),

  getVocab: () =>
    ipcRenderer.invoke(IPC.VOCAB_GET),

  setVocabEntry: (key: string, value: string) =>
    ipcRenderer.invoke(IPC.VOCAB_SET, { key, value }),

  deleteVocabEntry: (key: string) =>
    ipcRenderer.invoke(IPC.VOCAB_DELETE, { key }),

  getHistory: () =>
    ipcRenderer.invoke(IPC.HISTORY_GET),

  clearHistory: () =>
    ipcRenderer.invoke(IPC.HISTORY_CLEAR),

  onHotkeyToggle: (cb) => {
    const handler = () => cb()
    ipcRenderer.on(IPC.HOTKEY_TOGGLE, handler)
    return () => ipcRenderer.removeListener(IPC.HOTKEY_TOGGLE, handler)
  },

  onSessionError: (cb) => {
    const handler = (_: IpcRendererEvent, payload: SessionErrorPayload) => cb(payload)
    ipcRenderer.on(IPC.SESSION_ERROR, handler)
    return () => ipcRenderer.removeListener(IPC.SESSION_ERROR, handler)
  },

  getSttSettings: () =>
    ipcRenderer.invoke(IPC.STT_SETTINGS_GET),

  setSttSettings: (patch: Partial<SttSettings>) =>
    ipcRenderer.invoke(IPC.STT_SETTINGS_SET, patch),

  setOpenAIKey: (key: string) =>
    ipcRenderer.invoke(IPC.SECRET_SET_OPENAI_KEY, key),

  hasOpenAIKey: () =>
    ipcRenderer.invoke(IPC.SECRET_HAS_OPENAI_KEY),

  clearOpenAIKey: () =>
    ipcRenderer.invoke(IPC.SECRET_CLEAR_OPENAI_KEY),

  speakText: (text: string) =>
    ipcRenderer.invoke(IPC.TTS_SPEAK, text),

  stopSpeech: () =>
    ipcRenderer.invoke(IPC.TTS_STOP),

  onTtsState: (cb) => {
    const handler = (_: IpcRendererEvent, state: TtsState) => cb(state)
    ipcRenderer.on(IPC.TTS_STATE, handler)
    return () => ipcRenderer.removeListener(IPC.TTS_STATE, handler)
  },

  ttsRead: () =>
    ipcRenderer.invoke(IPC.TTS_READ),
}

contextBridge.exposeInMainWorld('api', api)
