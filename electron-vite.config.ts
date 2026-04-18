import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
    main: {
        build: {
            rollupOptions: {
                input: resolve(__dirname, 'src/main/index.ts'),
                external: ['electron']
            }
        }
    },
    preload: {
        build: {
            rollupOptions: {
                input: { index: resolve(__dirname, 'src/preload/index.ts') }
            }
        }
    },
    renderer: {
        root: resolve(__dirname, 'src/renderer'),
        plugins: [svelte()],
        resolve: {
            alias: {
                '@shared': resolve(__dirname, 'src/shared')
            }
        },
        build: {
            outDir: resolve(__dirname, 'out/renderer'),
            rollupOptions: {
                input: {
                    'control-strip': resolve(__dirname, 'src/renderer/control-strip/index.html'),
                    settings: resolve(__dirname, 'src/renderer/settings/index.html'),
                    history: resolve(__dirname, 'src/renderer/history/index.html')
                }
            }
        }
    }
})
