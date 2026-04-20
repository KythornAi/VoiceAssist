# CLAUDE.md -- VoiceAssist V2

> Global rules (UK English, no AI Overviews, source verification, etc.) live in `~/.claude/CLAUDE.md`
> and apply here automatically. This file covers only V2-specific context.

## What This Is

VoiceAssist V2 -- a ground-up rewrite of V1. Local-first dictation (talk-to-type) and read-aloud
for desktop. Primary user: Kyle (Mac, carpal tunnel). Secondary user: friend (Windows, dyslexia).

**Positioning:** Accessibility-first, one-time purchase, local-first. No subscriptions. No mandatory
accounts. Optional cloud features via user-provided API key only.

## Current Phase

Planning. Deep interview complete (19% ambiguity, S90).
Spec: `~/Desktop/Claude/.omc/specs/deep-interview-voiceassist-v2.md`

**Next step:** `gsd:discuss-phase` Phase 0 -- STT model research (user sentiment + benchmarks on
Distil-Whisper and alternatives before committing to a model).

**Target:** Core app working within ~2 weeks of Apr 2026. Landing page after. (Corrected S111 -- original "mid-July" was wrong.)

## Stack

* **Shell:** Electron + Vite (electron-vite)
* **Main process + preload:** TypeScript (ground-up rewrite -- V1 was vanilla JS)
* **Renderer:** Svelte components (one component tree per window type)
* **STT:** whisper.cpp native sidecar (TypeScript port of V1 sidecar). Model TBD after Phase 0 research.
* **TTS:** Piper TTS sidecar (TypeScript port). 3-tier fallback: OpenAI > Piper > System.
* **Text polish:** TypeScript port of V1 pipeline. Extends with custom dictionary.
* **Platform:** macOS + Windows (same as V1)

## Key Decisions (from Deep Interview, S90)

| Decision           | Outcome                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STT model          | Research user sentiment first. Distil-Whisper is primary candidate. Parakeet deprioritised (poor accuracy in Handy app). Benchmark 2-3 survivors before committing. |
| Model UX           | Auto-detect hardware on first run, pick best model. User never sees model names or makes technical choices.                                                         |
| Streaming          | Deferred to V2.1+. Accuracy is #1 for V2.                                                                                                                           |
| Migration strategy | Ground-up rewrite. V1 stays usable at `~/Desktop/VoiceAssist_PillMode/`. Port clean sidecar logic directly; rewrite architecture and all UI.                        |
| UI bar             | Professional, polished, "smart sleek compact" -- not developer-coded. Visual references from Dribbble/Mobbin/21st.dev (gathered during UI phase).                   |
| Format modes       | Manual picker before dictating: Note / Email / Chat / Terminal. No auto-detection.                                                                                  |
| Custom dictionary  | User can add/remove/edit personal words; integrated into text polish and STT post-processing.                                                                       |
| Cloud              | Local-first. Optional cloud STT/features via user-provided API key.                                                                                                 |
| Accuracy target    | 98%+ word accuracy (measured against V1 baseline, standard 50-word English paragraph).                                                                              |

## V1 Reference

V1 source: `~/Desktop/VoiceAssist_PillMode/Source_Code/`

Key V1 patterns to port directly (DO NOT reinvent):

* `whisper-sidecar.js` -- spawn whisper.cpp, pipe PCM via temp WAV, parse stdout
* `piper-sidecar.js` -- pipe text to piper stdin, get WAV on stdout, stream to renderer
* `text-polish.js` -- 5-stage pipeline (repetition, fillers, misspellings, locale, grammar)
* `download-whisper.js` / `download-piper.js` scripts
* `contextBridge` preload pattern (\~25 IPC methods)

V1 architecture to NOT carry forward:

* 695-line monolith main process -- replace with modular TypeScript modules
* Vanilla JS renderer with template literals -- replace with Svelte components
* `?window=` URL param routing -- use proper Svelte component trees per window

## V1 Electron Gotchas (carry forward)

These are hard-won lessons from V1. Respect them in V2:

* `transparent: true` on macOS always shows faint compositor border -- use 8px CSS margin inside oversized window
* `focusable: false` windows: `pointerdown` works but needs debounce guard
* Settings layout: `flex-wrap: wrap` on toggle-rows with dropdowns, `min-width` on `.lhs`
* Settings window behind alwaysOnTop control strip: `show: false` + `ready-to-show` + explicit `.focus()`
* IPC large data: never send large Float32Arrays as JSON -- use `buffer.slice(0)` to send as ArrayBuffer
* Control strip theming: all colours via CSS variables, never hardcoded rgba values

## V2 Architecture (target)

* **Main process:** Modular TypeScript. Separate modules: window management, IPC handlers, hotkeys, tray, settings store, dictation state machine.
* **Renderer:** Svelte. Separate component tree per window: control-strip, settings, history.
* **Preload:** TypeScript with shared IPC type definitions.
* **Security:** Type-safe IPC, validated inputs at preload boundary, secure API key storage (electron safeStorage or OS keychain). Production-ready from day one.
* **New features:** Custom dictionary, Format modes (Note/Email/Chat/Terminal).

## Dev Commands

```Shell
npm run dev                  # electron-vite dev (hot reload)
npm run build                # electron-vite build
npm run package:mac          # build + DMG
npm run package:win          # build + Windows EXE
npm run download:whisper     # download base.en whisper model
npm run download:whisper-small  # download small.en model
npm run download:all         # download all models + piper
```

## Key Paths

| Path                 | Purpose                                |
| -------------------- | -------------------------------------- |
| `src/main/`          | Main process TypeScript modules        |
| `src/renderer/`      | Svelte renderer (per-window)           |
| `src/preload/`       | TypeScript preload + IPC type defs     |
| `resources/bin/`     | Mac platform binaries (whisper, piper) |
| `resources/bin-win/` | Windows platform binaries              |
| `resources/models/`  | STT model files                        |
| `resources/voices/`  | Piper voice files                      |
| `scripts/`           | Download helpers                       |
| `docs/`              | Research docs, specs                   |
| `build/`             | electron-builder config, entitlements  |

## Session Workflow

* **Session state + handovers:** `~/Desktop/Claude/00_Session_Summary/` (state.md + WORKING\_HANDOVER.md)
* **V2 handover entries** are appended to the same WORKING\_HANDOVER.md. Label: `### Session N -- Desktop/VS Code/Terminal`.
* **This repo is local-only** -- check git remote before pushing. No automatic push unless a remote is confirmed.
* **Changelog:** Every session that changes behaviour appends under `[Unreleased]` in `CHANGELOG.md`.
  First real V2 release → rename to `[0.2.0] -- YYYY-MM-DD`, reset `[Unreleased]`.

## Karpathy Coding Principles

Behavioural guidelines to reduce common LLM coding mistakes. Biased toward caution over speed -- use judgement on trivial tasks.

### 1. Think Before Coding

Before implementing: state assumptions explicitly. If uncertain, ask. If multiple interpretations exist, present them -- don't pick silently. If a simpler approach exists, say so. If something is unclear, stop, name what's confusing, and ask.

### 2. Simplicity First

Minimum code that solves the problem. No features beyond what was asked. No abstractions for single-use code. No speculative flexibility or configurability. No error handling for impossible scenarios. If 200 lines could be 50, rewrite it.

### 3. Surgical Changes

Touch only what you must. Don't improve adjacent code, comments, or formatting. Don't refactor things that aren't broken. Match existing style. If you notice unrelated dead code, mention it -- don't delete it. Remove only imports/variables/functions that YOUR changes made unused.

### 4. Goal-Driven Execution

Transform tasks into verifiable goals. For multi-step tasks, state a brief plan with verify steps. Loop until verified. Weak criteria ("make it work") require constant clarification -- define success upfront.

***

## Non-Goals for V2

* Real-time/streaming dictation (V2.1+)
* Auto-detect format mode from active app
* iOS/mobile
* Linux (evaluate for V2.1)
* Running own cloud STT infrastructure
* Voice commands / workflow integration
* Audio file upload/transcription
* AI notepad / meeting mode

