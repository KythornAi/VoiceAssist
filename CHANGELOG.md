# Changelog

All notable changes to VoiceAssist V2 will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
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
