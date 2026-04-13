# Phase 0 STT Model Research

**Date:** 13 April 2026  
**Purpose:** Evaluate STT model candidates before committing to one for V2. Covers user sentiment, accuracy benchmarks, and whisper.cpp compatibility.  
**Constraint:** V2 uses whisper.cpp as the inference engine (sidecar pattern from V1). Any model that cannot run in whisper.cpp is disqualified unless the sidecar architecture changes.

---

## TL;DR Recommendation

**Primary: Whisper large-v3-turbo via whisper.cpp**

Distil-Whisper was the original candidate, but it has a critical whisper.cpp limitation (see below) that makes large-v3-turbo the better choice. Large-v3-turbo has full native whisper.cpp support, slightly better accuracy, and excellent Apple Silicon performance via Metal.

**Benchmark these two:**
1. `large-v3-turbo` (primary)
2. `distil-large-v3` (compare -- despite the whisper.cpp caveat, worth measuring the quality gap)

**Rule out:** Canary Qwen 2.5B, Parakeet, Moonshine -- all require a different inference stack than whisper.cpp.

---

## The 98%+ Accuracy Target: Reality Check

The 98%+ word accuracy target is achievable -- but only on clean speech. Real-world numbers vary significantly:

| Condition | large-v3-turbo WER | Accuracy |
|-----------|-------------------|----------|
| LibriSpeech Clean (ideal) | 1.9% | **98.1%** ✓ |
| Mixed benchmarks (Northflank) | 7.75% | ~92% |
| Real-world noisy (Ionio benchmark) | varies | ~85-93% |

Source: [GitHub faster-whisper benchmark #1030](https://github.com/SYSTRAN/faster-whisper/issues/1030), [Northflank STT benchmarks](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks)

**Verdict:** 98%+ is achievable for normal dictation (quiet room, clear speech -- which is the primary use case for VoiceAssist). It is not achievable in noisy environments or for speakers with speech impairments. This is acceptable for V2 scope.

---

## whisper.cpp Compatibility (Critical Filter)

This is the deciding factor. V2 uses whisper.cpp. Models without native support require a new sidecar -- a significant architecture change.

| Model | whisper.cpp support | Notes |
|-------|---------------------|-------|
| large-v3-turbo | **Full** | GGML files in official HuggingFace repo. Quantized variant (q5_0, 547 MB) available. |
| large-v3 | **Full** | GGML files available. Slower, larger. |
| large-v2 | **Full** | Older, slightly lower accuracy. |
| distil-large-v3 | **Partial** | Initial support added but chunk-based transcription NOT implemented. Official README explicitly notes quality may be suboptimal. |
| Canary Qwen 2.5B | None | Requires NeMo / ONNX stack. |
| Parakeet TDT | None | Requires ONNX / sherpa-onnx stack. |
| Moonshine | None | No whisper.cpp support. |

Sources: [whisper.cpp models README](https://github.com/ggerganov/whisper.cpp/blob/master/models/README.md), [distil-whisper whisper.cpp discussion #1414](https://github.com/ggml-org/whisper.cpp/discussions/1414), [whisper-turbo issue #2439](https://github.com/ggml-org/whisper.cpp/issues/2439)

**The distil-whisper finding is significant.** The official whisper.cpp README states: "the current implementation is not optimal since it does not support the proposed chunking strategy... transcription quality using whisper.cpp compared to the original distil-whisper transformers implementation can be lower in some cases." This was the original primary candidate.

---

## Model-by-Model Assessment

### Whisper large-v3-turbo (Recommended Primary)

**What it is:** OpenAI's October 2024 release. large-v3 with the decoder pruned from 32 to 4 layers, then fine-tuned. 809M parameters, MIT licence.

**Accuracy:**
- WER 1.919% on LibriSpeech Clean (GPU benchmark, faster-whisper)
- WER 7.75% on mixed benchmarks
- ~1% lower WER than distil-large-v3 per Groq's independent benchmark

**Speed on Apple Silicon (whisper.cpp + Metal):**
| Chip | 60s audio processing time | Real-time factor |
|------|--------------------------|-----------------|
| M1 | ~5.8s | 6x |
| M2 Pro | ~3.2s (with flash attn: ~2.8s) | 10x |
| M3 Max | ~1.9s | 14x |
| M4 Pro | ~1.6s | 16x |

Memory: ~1.7 GB RAM (unified memory, no PCIe bus copy overhead on Apple Silicon)  
Quantized (q5_0): 547 MB, ~same accuracy

Source: [fazm.ai whisper.cpp Metal benchmark](https://fazm.ai/blog/whisper-cpp-metal-apple-silicon), [fazm.ai ggml-large-v3-turbo-bin](https://fazm.ai/blog/ggml-large-v3-turbo-bin)

**Hallucination behaviour:** Known Whisper-family issue. ~1% of transcriptions can contain hallucinated phrases, primarily triggered by long silences/pauses. Disproportionate for speakers with speech impairments. Can be mitigated by VAD (Voice Activity Detection) preprocessing -- whisper.cpp has VAD support built in as of May 2025.

Source: [Cornell / FAccT "Careless Whisper" study](https://facctconference.org/static/papers24/facct24-111.pdf), [arxiv hallucination investigation](https://arxiv.org/html/2501.11378v1)

**whisper.cpp support:** Full. GGML and quantized files at `huggingface.co/ggerganov/whisper.cpp`.

---

### Distil-Whisper large-v3 (Compare in Benchmark)

**What it is:** HuggingFace's knowledge-distilled version of large-v3. 756M parameters, MIT licence, English-only.

**Claimed accuracy:** Within 1% WER of large-v3 per official benchmarks. Short-form WER 9.7%, long-form WER 10.8% (official HuggingFace table).

**Speed:** 6.3x faster than large-v3. Similar to large-v3-turbo but with 2 decoder layers vs turbo's 4.

**whisper.cpp caveat (critical):** Chunk-based transcription is not implemented. The official whisper.cpp repo explicitly notes this leads to suboptimal quality vs the HuggingFace transformers implementation. This means the claimed accuracy figures may not hold in the V2 sidecar context.

**Verdict:** Still worth benchmarking directly in whisper.cpp to measure the real quality gap vs large-v3-turbo. If the gap is small, it may still be viable for lower-end hardware. But it is no longer the default recommendation.

Source: [HuggingFace distil-whisper README](https://github.com/huggingface/distil-whisper), [whisper.cpp distil discussion #1414](https://github.com/ggml-org/whisper.cpp/discussions/1414)

---

### Whisper large-v3 (Fallback / Max Accuracy Option)

**What it is:** OpenAI's current top Whisper model. 1.55B parameters, MIT licence, 99+ languages.

**Accuracy:** WER 7.4% on mixed benchmarks. 2.8% on LibriSpeech Clean.

**Speed:** ~3x slower than large-v3-turbo. ~3GB model (q5_0: 1.1GB).

**Verdict:** Viable as a "high accuracy mode" for users on fast hardware. Not the default -- too slow for snappy dictation on M1.

---

### Canary Qwen 2.5B (Highest Accuracy -- Architecture Blocker)

**What it is:** NVIDIA's SALM hybrid ASR+LLM model. Currently tops the HuggingFace Open ASR Leaderboard. 2.5B parameters, Apache 2.0 licence, English-only.

**Accuracy:** 5.63% WER (Open ASR Leaderboard), 1.6% WER on LibriSpeech Clean. Best accuracy of any open model evaluated.

**Blocker:** No whisper.cpp support. Requires NeMo framework or ONNX. Would require writing a new sidecar from scratch.

**Verdict:** Architecturally incompatible with V2 whisper.cpp sidecar. Revisit for V3 if a new sidecar architecture is warranted.

Source: [Northflank STT 2026 benchmarks](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks), [Modal open-source STT guide](https://modal.com/blog/open-source-stt)

---

### Parakeet TDT (Ruled Out)

Already deprioritised based on Kyle's real-world experience with the Handy app. Benchmarks show 6.05% WER which looks good, but real-world reports are mixed. Also requires sherpa-onnx / ONNX stack -- not whisper.cpp compatible.

Source: [Modal open-source STT](https://modal.com/blog/open-source-stt)

---

### Moonshine (Ruled Out for V2)

**What it is:** Useful Sensors' tiny edge-focused model. 27M--270M parameters, MIT licence.

**Accuracy:** ~12.66% WER (Tiny), ~10.07% WER (Base). Competitive with Whisper tiny/base, not with large models.

**Verdict:** Designed for mobile/IoT. Not competitive with large-v3-turbo for desktop dictation accuracy. No whisper.cpp support. Not relevant for V2.

Source: [Moonshine GitHub README](https://github.com/usefulsensors/moonshine/blob/main/README.md), [Northflank STT 2026](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks)

---

## Benchmark Plan

Before committing to a model, run a direct comparison in whisper.cpp on Kyle's Mac.

### What to benchmark

| Model | GGML file | Size |
|-------|-----------|------|
| large-v3-turbo | `ggml-large-v3-turbo.bin` | 1.5 GB |
| large-v3-turbo-q5_0 | `ggml-large-v3-turbo-q5_0.bin` | 547 MB |
| distil-large-v3 | convert from HuggingFace | ~1.5 GB |

### Test conditions

1. **Clean speech** -- quiet room, normal speaking pace (primary use case)
2. **With pauses** -- deliberate pauses mid-sentence (hallucination trigger)
3. **Background noise** -- fan/AC in background

### What to measure

- Word accuracy on a fixed 50-word test paragraph (same one used for V1 baseline)
- Transcription latency (time from audio end to text output)
- Hallucination incidence on silence/pause samples

### Hallucination mitigation

Enable VAD in whisper.cpp (available since May 2025). This pre-processes audio to strip non-speech segments before passing to the model. Expected to significantly reduce hallucination rate.

---

## Key Decisions for V2 Architecture

1. **Model format:** GGML (native whisper.cpp format). Quantized q5_0 variants are the default download for lower-end hardware; full precision for M2+ hardware that can handle it.

2. **Hardware auto-detection:** Match model to hardware at first launch:
   - M1 / low RAM → `large-v3-turbo-q5_0` (547 MB, fast enough)
   - M2+ / 16GB+ RAM → `large-v3-turbo` (full precision)
   - Windows CPU-only → `large-v3-turbo-q5_0` (runs on CPU, slower but acceptable)

3. **Metal acceleration:** Build whisper.cpp with `-DGGML_METAL=ON` for Mac. Provides 2-3x speedup on M-series. Flash attention (`-fa` flag) for additional gains on M2+.

4. **VAD preprocessing:** Enable whisper.cpp VAD to reduce hallucinations on silence. Critical for accessibility (users with speech patterns that include longer pauses).

---

## Sources

- [Northflank Best STT Models 2026](https://northflank.com/blog/best-open-source-speech-to-text-stt-model-in-2026-benchmarks)
- [HuggingFace distil-whisper README](https://github.com/huggingface/distil-whisper)
- [whisper.cpp models README](https://github.com/ggerganov/whisper.cpp/blob/master/models/README.md)
- [whisper.cpp GitHub (ggml-org)](https://github.com/ggml-org/whisper.cpp)
- [fazm.ai Metal + Apple Silicon benchmark](https://fazm.ai/blog/whisper-cpp-metal-apple-silicon)
- [fazm.ai ggml-large-v3-turbo-bin benchmark](https://fazm.ai/blog/ggml-large-v3-turbo-bin)
- [faster-whisper benchmark #1030](https://github.com/SYSTRAN/faster-whisper/issues/1030)
- [whisper-turbo support issue #2439](https://github.com/ggml-org/whisper.cpp/issues/2439)
- [distil-whisper whisper.cpp discussion #1414](https://github.com/ggml-org/whisper.cpp/discussions/1414)
- [Modal open-source STT guide](https://modal.com/blog/open-source-stt)
- [Cornell "Careless Whisper" FAccT 2024](https://facctconference.org/static/papers24/facct24-111.pdf)
- [Ionio edge STT benchmark 2025](https://www.ionio.ai/blog/2025-edge-speech-to-text-model-benchmark-whisper-vs-competitors)
- [Groq Whisper Turbo announcement](https://groq.com/blog/whisper-large-v3-turbo-now-available-on-groq-combining-speed-quality-for-speech-recognition)
- [Moonshine GitHub README](https://github.com/usefulsensors/moonshine/blob/main/README.md)
- [mac-whisper-speedtest benchmark (M4)](https://github.com/anvanvan/mac-whisper-speedtest)
