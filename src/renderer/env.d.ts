declare module '*.css' {
  const content: string
  export default content
}

declare global {
  interface Window {
    api: import('@shared/ipc-contract').WindowApi
  }
}
