/// <reference types="vite/client" />

declare module '*.css' {
  const content: string
  export default content
}

interface Window {
  api: import('@shared/ipc-contract').WindowApi
}
