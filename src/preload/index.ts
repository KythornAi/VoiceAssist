import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { IPC, type WindowApi, type TranscriptResult } from '../shared/ipc-contract'
import type { SessionState } from '../shared/types'

const api: WindowApi = {
  ping: () =>
    ipcRenderer.invoke(IPC.APP_PING),

  startSession: () =>
    ipcRenderer.invoke(IPC.SESSION_START),

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
}

contextBridge.exposeInMainWorld('api', api)
