import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import type { Plugin } from 'vite'

const shared = resolve(__dirname, 'src/shared')

const rendererInput = {
    'control-strip': resolve(__dirname, 'src/renderer/control-strip/index.html'),
    settings: resolve(__dirname, 'src/renderer/settings/index.html'),
    history: resolve(__dirname, 'src/renderer/history/index.html')
}

// electron-vite loses rollupOptions.input from the renderer build config before
// its configResolved validation runs. This plugin restores it just-in-time by
// mutating the resolved config before the post-enforce validation hook fires.
const multiPageInputPlugin: Plugin = {
    name: 'renderer-multipage-input',
    configResolved(config) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ro = (config.build.rollupOptions as any)
        if (!ro.input) {
            ro.input = rendererInput
        }
    }
}

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
        plugins: [svelte(), multiPageInputPlugin],
        resolve: {
            alias: {
                '@shared': shared
            }
        }
    }
})
