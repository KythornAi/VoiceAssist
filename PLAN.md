# VoiceAssist -- Implementation Plan

Last updated: Mar 8, 2026

## What This Is

A fully local, zero-cost voice assistant desktop app. Dictate text, read aloud highlighted text, translate. Works offline, no API keys required for the free tier.

**Who it's for:** Kyle (Mac) and his friend (Windows, dyslexic, recently bereaved, job hunting). Friend cannot manage or afford API keys -- the free tier must work out of the box.

## Current State

Working Electron + Vite app with:
- Control strip (floating panel, non-focusable)
- Settings window, history window
- Global hotkeys for dictation and read-aloud
- WASM Whisper STT via @xenova/transformers (TOO SLOW -- must replace)
- System voice TTS (SpeechSynthesis API) as default
- OpenAI TTS as optional premium voice
- NLLB-200 local translation (free) + OpenAI GPT-4o-mini translation (premium)
- Text injection via clipboard + simulated Cmd/Ctrl+V
- Sound effects (start, success, error)
- Mac DMG + Windows EXE builds (electron-builder)

**Known issues:**
- WASM Whisper is painfully slow (9+ hours wasted on this). Must switch to whisper.cpp native sidecar.
- Uses deprecated ScriptProcessor for audio capture. Must switch to AudioWorklet.
- Mini/pill mode dictation broken -- focusable:false prevents click events reaching buttons properly.
- Builds exist but are outdated (pre-pill-mode changes).

## The Plan

### Phase 1: whisper.cpp sidecar (STT fix -- highest priority)

**Goal:** Fast, local speech-to-text that actually works.

**Approach:**
- Download pre-built whisper.cpp binaries for Mac (arm64 + x86_64) and Windows (x64)
- Bundle as sidecar in `resources/bin/` (electron-builder extraFiles)
- Download whisper model file (ggml-base.en.bin, ~142MB) on first run to app userData
- New main-process module `src/main/whisper-sidecar.js`:
  - Spawn whisper.cpp as child process
  - Pipe PCM audio via stdin or temp WAV file
  - Parse stdout for transcript
  - Handle errors, timeouts, process lifecycle
- Modify `audio-capture.js`: remove @xenova/transformers, send raw PCM to main process via IPC instead of running Whisper in renderer
- Remove `@xenova/transformers` dependency from package.json
- Remove WASM-related build config (asarUnpack for .wasm files)

**Files to create:**
- `src/main/whisper-sidecar.js`
- `resources/bin/.gitkeep` (binaries not committed, downloaded at build/first-run)
- `scripts/download-whisper.js` (helper to fetch binaries + model)

**Files to modify:**
- `src/renderer/src/audio-capture.js` (strip Whisper, send PCM via IPC)
- `src/main/index.js` (wire up sidecar IPC)
- `src/preload/index.js` (add IPC channels for audio data)
- `package.json` (remove @xenova/transformers, add extraFiles config, add download script)
- `electron-vite.config.mjs` (remove WASM copy plugin if present)

### Phase 2: Text polish pipeline (spelling, grammar, locale)

**Goal:** Clean, accurate, properly spelled text every time -- no extra apps needed. Free tier.

**Why this matters:** Kyle has carpal tunnel (typing corrections hurt). Friend is dyslexic (spelling is hard). Both are UK-based and need UK English output. The app should handle all of this so neither has to fix text after dictating.

**Post-processing pipeline (runs after Whisper, before paste):**
1. **Spelling correction** -- fix common misspellings (definately -> definitely, recieve -> receive, etc.)
2. **Locale enforcement** (UK or US, user picks in settings) -- color -> colour, behavior -> behaviour, organize -> organise, etc. ~200 word pairs covers the vast majority.
3. **Grammar tidy** -- capitalise after full stops, fix double spaces, basic comma placement
4. **Filler word removal** (already exists, moves into this pipeline)
5. **Repetition filter** (already exists, moves into this pipeline)

**Settings:**
- Spelling region: UK / US (default: UK)
- Auto-correct spelling: on/off (default: on)
- Grammar cleanup: on/off (default: on)

**Approach (free tier -- rules engine):**
- `src/main/text-polish.js` -- pure JS module, no dependencies
- Dictionary of ~200 US/UK word pairs (bidirectional)
- Common misspelling dictionary (~500 entries, covers dyslexia-frequent errors too)
- Regex-based grammar rules (capitalisation, spacing, punctuation)
- Runs synchronously, <10ms per transcript -- no perceptible delay

**Premium option (OpenAI, optional):**
- If user has an API key and enables "AI polish", send transcript through GPT-4o-mini for smarter cleanup
- Handles edge cases the rules engine can't (ambiguous phrasing, context-dependent corrections)
- Falls back to rules engine if API call fails

**Files to create:**
- `src/main/text-polish.js` (rules engine + locale dictionaries)
- `src/main/dictionaries/uk-us-pairs.json` (US/UK spelling pairs)
- `src/main/dictionaries/common-misspellings.json` (misspelling corrections)

**Files to modify:**
- `src/main/index.js` (wire text-polish into transcript pipeline, before injectText)
- `src/renderer/src/settings.js` (add locale picker + polish toggles)
- `src/preload/index.js` (if new IPC channels needed)

### Phase 3: Piper TTS (better free voices)

**Goal:** Replace robotic system voices with natural-sounding Piper TTS. Free, local, no API key.

**Approach:**
- Download pre-built piper binaries (Mac + Windows) + a default voice model
- Bundle as sidecar alongside whisper.cpp
- New module `src/main/piper-sidecar.js`:
  - Pipe text to piper stdin, get WAV audio on stdout
  - Stream to renderer for playback
- Settings UI: voice picker shows Piper voices (free) + OpenAI voices (premium, needs key)
- System voice becomes last-resort fallback only

**Files to create:**
- `src/main/piper-sidecar.js`

**Files to modify:**
- `src/renderer/src/audio-capture.js` (add Piper playback path)
- `src/renderer/src/settings.js` (Piper voice picker)
- `src/main/index.js` (Piper IPC)
- `package.json` (extraFiles for piper binaries)

### Phase 4: AudioWorklet migration

**Goal:** Replace deprecated ScriptProcessor with AudioWorklet for audio capture.

**Approach:**
- Create `src/renderer/public/audio-worklet-processor.js` (runs in audio thread)
- Update `audio-capture.js` to use AudioWorkletNode instead of createScriptProcessor
- Test that PCM capture still works correctly at 16kHz mono

**Files to create:**
- `src/renderer/public/audio-worklet-processor.js`

**Files to modify:**
- `src/renderer/src/audio-capture.js`

### Phase 5: Fix mini/pill mode

**Goal:** Make the floating control strip buttons work properly.

**Root cause:** `focusable: false` on the BrowserWindow prevents normal click events. Buttons need `acceptFirstMouse` behaviour and possibly pointer-events workarounds.

**Approach:**
- Investigate: does `acceptFirstMouse: true` (already set) actually work for in-page buttons?
- If not, use `mouse-events` approach: track mouse position and trigger actions via main process
- Alternative: make window temporarily focusable on mouseenter, unfocusable on mouseleave
- Test on both Mac and Windows

**Files to modify:**
- `src/main/index.js` (window config)
- `src/renderer/src/control-strip.js` (click handling)

### Phase 6: Build and ship

**Goal:** Produce working Mac DMG + Windows EXE with bundled binaries.

**Approach:**
- `scripts/download-whisper.js` fetches platform-specific binaries + model
- electron-builder config uses `extraFiles` to bundle `resources/bin/`
- Mac: DMG with code signing (or unsigned for now -- Kyle can right-click open)
- Windows: NSIS installer
- Test both builds end-to-end
- Give friend the Windows build

**Files to modify:**
- `package.json` (build config, scripts)
- Possibly `build/` directory (installer config)

## What's NOT in scope (for now)

- Cloud sync, accounts, login
- Mobile app
- Continuous/streaming dictation (stop-and-transcribe is fine for v1)
- Custom wake words
- Voice commands ("delete that", "new line") -- nice to have later

## Decision Log

| Date | Decision | Reasoning |
|------|----------|-----------|
| Mar 7 | whisper.cpp over WASM Whisper | WASM too slow (9+ hours wasted). Native binary is 10-50x faster. |
| Mar 7 | Piper TTS over system voice | System voices sound robotic. Piper is free, local, natural-sounding. |
| Mar 7 | Keep NLLB-200 translation | Free, local, works offline. Perfect for zero-cost tier. |
| Mar 7 | OpenAI as optional premium only | Friend can't afford API keys. Free tier must work standalone. |
| Mar 7 | Electron stays | Already built, works cross-platform. No reason to rewrite. |
| Mar 8 | Text polish pipeline (Phase 2) | Kyle (carpal tunnel) and friend (dyslexic) both need clean output. Rules engine is free + instant. |
| Mar 8 | UK/US locale toggle | Both users are UK-based. Must not force American spelling. Free tier feature. |
| Mar 8 | Medium cleanup level | Fix spelling + basic grammar. Don't rephrase (risks changing meaning). |
