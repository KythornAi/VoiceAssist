# VoiceAssist -- Competitive Research

Compiled: Mar 9, 2026 (Session 58)

## Competitor Landscape

| App | Platform | Offline | Pricing | Key differentiator |
|-----|----------|---------|---------|-------------------|
| **SuperWhisper** | Mac, Win, iOS | Yes | Free + sub + $249 lifetime | AI modes (formal, casual, legal), custom prompts, multi-LLM |
| **Wispr Flow** | Mac, Win, mobile | Cloud-only | ~$12/mo ($144/yr) | Auto-adapts tone per app, snippet library, personal dictionary |
| **MacWhisper** | Mac only | Yes | Free + $69 lifetime | File/meeting transcription focus, not real-time dictation |
| **Spokenly** | Mac, iOS | Yes | Free + $9.99/mo | Agent mode (voice commands to control Mac), 100k+ users |
| **Voibe** | Mac only (Apple Silicon) | Yes | Free + $4.90/mo or $99 lifetime | Sub-300ms latency, ultra-lightweight |
| **Talon Voice** | Mac, Win, Linux | Yes | Free | Full computer control by voice, eye tracking, Python scripting |
| **Buzz** | Mac, Win, Linux | Yes | Free/open-source + paid Mac app | File import + live mic, 90+ languages |

## Top 15 User Pain Points & Wishes (sourced from forums)

### 1. Privacy / Cloud-only processing is a dealbreaker
Wispr Flow's cloud-only architecture caused mass cancellations. People want local processing.
- Sources: Letterly review, Ryan Shrott Medium articles (Feb 2026)

### 2. LLM post-processing / text cleanup after transcription
Raw Whisper output needs filler removal, formatting. SuperWhisper "lacks deep editing tools." MacWhisper has no LLM cleanup at all.
- Sources: Product Hunt reviews, Samwize blog comparison

### 3. Cross-platform support (Windows, Linux, not just Mac)
Most polished tools are Mac-only. Linux situation is "dire." HN flooded with Show HN posts trying to fill the gap.
- Sources: Medium articles, OpenWhispr, HN threads (LotusQ, EasyDictate, Chirp)

### 4. Latency / speed of transcription
Large models are 3-8x slower than small/tiny. Users want text appearing as they speak.
- Sources: HN comments, Onit Dictate thread

### 5. Resource usage (RAM, CPU, battery)
Wispr Flow uses ~800MB idle RAM and spins up fans. Users want lightweight background processes.
- Sources: Medium cancellation article, Letterly review

### 6. Dictation stops / times out too quickly
Apple's built-in stops after 60 seconds. Words disappear after dictation stops.
- Sources: MacRumors forums

### 7. Custom vocabulary / technical term recognition
Apple dictation "struggles with work jargon, foreign names, and technical terminology." No way to add custom words.
- Sources: MacRumors forums, Willow voice-to-text blog

### 8. Voice commands vs. general dictation
"Delete last sentence" or "new paragraph" get transcribed literally. Whisper isn't optimised for command recognition.
- Sources: HN comment thread

### 9. Noisy environment accuracy
Accuracy drops to 65-75% in open offices. Every 4th-5th word needs manual correction.
- Sources: MacRumors forums, Sotto blog

### 10. Whispering / quiet voice support
Speaking quietly so colleagues or family don't hear. Real need for open offices and late-night use.
- Sources: Letterly review, Zapier article

### 11. Real-time visual feedback while dictating
Users want to see text appearing live, not a text dump after silence.
- Sources: HN comment thread

### 12. Glitchy hotkey / activation reliability
SuperWhisper "has glitches everywhere, with issues where it doesn't catch key bindings." Must be rock-solid.
- Sources: Samwize review, eesel.ai review

### 13. Pricing -- subscription fatigue
HN full of "free alternative to Wispr Flow" posts. Users strongly prefer one-time purchase or free.
- Sources: Multiple HN threads, Samwize comparison

### 14. Slow startup / initialisation time
Wispr Flow takes 8-10 seconds to initialise. Unacceptable for quick dictation bursts.
- Sources: Letterly review

### 15. No learning / adaptation over time
Apple dictation "doesn't learn from mistakes or adapt to vocabulary." Every session starts from zero.
- Sources: MacRumors forums

## Where VoiceAssist Already Wins

- Local/offline (pain point #1)
- Text polish pipeline (pain point #2 -- partial, needs improvement)
- Cross-platform Mac + Windows (pain point #3)
- No subscription (pain point #13)
- No timeout on dictation (pain point #6)

## Feature Opportunities (prioritised)

| Feature | Difficulty | Impact | Why |
|---------|-----------|--------|-----|
| **OpenAI text cleanup (optional cloud)** | Low | High | Use GPT-4o-mini for smart text polish when API key is set. Local polish as free fallback. |
| **Voice commands** ("delete that", "new line") | Medium | High | Nobody does this well except Talon (which is complex) |
| **Custom vocabulary/dictionary** | Low-Medium | High | Technical users and accessibility users both need this |
| **Real-time streaming text** | Medium | High | Show words as they're spoken, not after silence |
| **Whisper/quiet mode** | Low | Medium | Great for shared spaces, accessibility |
| **Linux support** | Medium | Medium | Underserved market. Needs more research -- smart Linux users may already have solutions |
| **Learning/adaptation** | High | Medium | Store correction patterns, adapt over time. Complex but differentiating. |

## OpenAI Integration Strategy (research notes)

Current setup: OpenAI API key already in app for TTS voice.

Potential tiered approach:
- **Free tier (local only):** Whisper STT + local text polish + Piper TTS. No API key needed.
- **Pro tier (with API key):** OpenAI transcription endpoint for better accuracy + GPT-4o-mini for smart text cleanup + OpenAI TTS for natural voices.

Specific endpoints to investigate:
- `gpt-4o-transcribe` or Whisper API -- tuned and priced for STT
- `gpt-4o-mini-tts` -- cheap, natural TTS
- `gpt-4o-mini` chat -- "clean up this dictated text" on demand, not every recording

Cost strategy: Use OpenAI only for the occasional transformation, not every second of audio.

## Further Research Needed

- Linux dictation landscape (deeper dive -- what do terminal-native users actually use?)
- OpenAI transcription API pricing vs local Whisper accuracy trade-off
- Accessibility features for dyslexia (font choices, reading speed, visual feedback)
- One-time purchase pricing research (what would people pay? $29? $49? $99?)
