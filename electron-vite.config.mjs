import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'electron-vite'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
    main: {
        build: {
            rollupOptions: {
                input: resolve(__dirname, 'src/main/index.js'),
                external: ['electron']
            }
        }
    },
    preload: {
        build: {
            rollupOptions: {
                input: { index: resolve(__dirname, 'src/preload/index.js') }
            }
        }
    },
    renderer: {
        root: resolve(__dirname, 'src/renderer'),
        publicDir: resolve(__dirname, 'src/renderer/public'),
        build: {
            outDir: resolve(__dirname, 'out/renderer'),
            rollupOptions: {
                input: {
                    index: resolve(__dirname, 'src/renderer/index.html'),
                    settings: resolve(__dirname, 'src/renderer/settings.html'),
                    history: resolve(__dirname, 'src/renderer/history.html'),
                    controlStrip: resolve(__dirname, 'src/renderer/control-strip.html')
                }
            }
        }
    }
})
