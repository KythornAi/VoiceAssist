import { defineConfig, normalizePath } from 'vite' // wait, electron-vite uses its own defineConfig. Just import from vite.
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { defineConfig as defineElectronConfig } from 'electron-vite'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineElectronConfig({
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
        plugins: [
            viteStaticCopy({
                targets: [
                    { src: normalizePath(resolve(__dirname, 'node_modules/@xenova/transformers/dist/transformers.js')), dest: '.' },
                    { src: normalizePath(resolve(__dirname, 'node_modules/@xenova/transformers/dist/ort-wasm.wasm')), dest: '.' },
                    { src: normalizePath(resolve(__dirname, 'node_modules/@xenova/transformers/dist/ort-wasm-simd.wasm')), dest: '.' },
                    { src: normalizePath(resolve(__dirname, 'node_modules/@xenova/transformers/dist/ort-wasm-threaded.wasm')), dest: '.' },
                    { src: normalizePath(resolve(__dirname, 'node_modules/@xenova/transformers/dist/ort-wasm-simd-threaded.wasm')), dest: '.' }
                ]
            })
        ],
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
