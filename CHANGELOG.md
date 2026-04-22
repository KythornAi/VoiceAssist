# Changelog

All notable changes to VoiceAssist V2 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Phase 5 complete. Format mode picker (Note/Email/Chat/Terminal) added to control strip. Selected mode passed through IPC to `SessionManager.start()` and applied as the final stage of `TranscriptPipeline`. `FormatFormatter` applies mode-specific rules: note = passthrough, email = capitalise + trailing full stop, chat = strip trailing full stop, terminal = lowercase + strip punctuation. Transcript result now displayed below the control strip bar. 47 tests passing.
- Phase 4 complete. Settings IPC exposes `PolishSettings` (locale, fixSpelling, fixGrammar, removeFillerWords) to renderer via `settings:get/set` channels. Vocab CRUD via `vocab:get/set/delete` channels. `TranscriptPipeline` now reads settings live via getter on each call. `settings-store.ts` wraps `JsonStore<PolishSettings>` with UK-English defaults. Settings renderer (`App.svelte`) has locale picker, 3 toggles, and vocabulary add/delete table. 30 tests passing.
- Phase 3 complete. Transcript polish pipeline wired between STT output and `session:transcript` event. `TranscriptAssembler` joins ordered segments with boundary deduplication. `TextPolisher` TypeScript port of V1 5-stage pipeline (repetition filter, filler removal, misspelling correction, locale enforcement, grammar tidy). `VocabularyCorrector` applies user-defined custom word corrections. 25 unit tests all passing.
- Phase 2 complete. Persistent `whisper-server` worker with `ggml-large-v3-turbo-q5_0` model. Session stop triggers transcription (server start 0.6s + transcription ~1.3s on Apple M4). Transcript delivered via `session:transcript` IPC event. Architecture: `WhisperWorker` → `WhisperSttEngine` → `SessionManager` → renderer.
- Phase 1 complete (all 10 checks green). Ground-up TypeScript + Svelte 5 scaffold verified working end-to-end in dev mode on macOS.
- Phase 1 Stage E: `SessionManager` + IPC handlers + `JsonStore` + chunked `AudioWorklet` capture + Vitest smoke test (`src/main/session/`, `src/main/ipc/`, `src/renderer/shared/`).
- Phase 1 Stage D: 3 Svelte 5 window shells + `env.d.ts` (`src/renderer/`). `npm run typecheck` green (87 files).
- Phase 1 Stage C: typed IPC contract (`src/shared/ipc-contract.ts` + `types.ts`), main entry + logger + window manager + 3 window configs (`src/main/`), typed preload contextBridge (`src/preload/index.ts`). `npm run typecheck` green.
- Phase 1 Stage B: `electron-vite.config.ts` with Svelte plugin, TS entries, 3 per-window renderer entries, `@shared` alias across all process types.
- Phase 1 Stage A: V1 JS archived to `src/_v1-reference/`. TypeScript 6, Svelte 5, electron-log 5, Vitest 4, ESLint 10, Prettier installed. tsconfig trio + config files.
- Repo initialised from V1 (VoiceAssist v0.1.0) on branch `v2-dev`.
- Competitive research and V2 feature roadmap (`docs/V2_RESEARCH.md`).
- Deep interview spec (9 rounds, 19% ambiguity) at `~/Desktop/Claude/.omc/specs/deep-interview-voiceassist-v2.md`.
- `CLAUDE.md` and `CHANGELOG.md` for V2 development tracking.

---

## Baseline -- V1 (v0.1.0, April 2026)

V2 starts from V1 v0.1.0 ([KythornAi/VoiceAssist](https://github.com/KythornAi/VoiceAssist/releases/tag/v0.1.0)).
V1 history is preserved in the V1 repo. This changelog tracks only V2-specific changes.

**V1 delivered:**
- whisper.cpp native sidecar for STT (base.en + small.en models)
- Piper TTS sidecar (Python on Mac, native on Windows)
- 5-stage text polish pipeline (repetition, fillers, misspellings, locale, grammar)
- Floating pill control strip (always-on-top, non-focusable)
- Settings window: voice picker, speed, locale (UK/US), hotkeys
- History window (last 20 transcripts)
- In-app model download with progress bar
- Mac DMG (1.0 GB) + Windows EXE (977 MB) builds
