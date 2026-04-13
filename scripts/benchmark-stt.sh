#!/usr/bin/env bash
# benchmark-stt.sh
# Compares large-v3-turbo vs distil-large-v3 via whisper.cpp on Mac.
# Usage: ./scripts/benchmark-stt.sh [path/to/audio.wav]
#
# If no WAV is provided, the script records a 30-second clip via your mic.
# Models are downloaded automatically if not present (~547 MB + ~756 MB).

set -euo pipefail

# ── Paths ──────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
MODEL_DIR="$REPO_ROOT/resources/models"
RESULTS_DIR="$REPO_ROOT/docs/benchmark-results"

# Prefer V2 binary if it exists, fall back to V1
WHISPER_BIN="$REPO_ROOT/resources/bin/whisper-cli"
if [[ ! -x "$WHISPER_BIN" ]]; then
  V1_BIN="/Volumes/Home Ext/Home Ext/Desktop/VoiceAssist_PillMode/Source_Code/resources/bin/whisper-cli"
  if [[ -x "$V1_BIN" ]]; then
    WHISPER_BIN="$V1_BIN"
  else
    echo "ERROR: whisper-cli not found. Expected at:"
    echo "  $REPO_ROOT/resources/bin/whisper-cli"
    echo "  $V1_BIN"
    exit 1
  fi
fi

# ── Models ─────────────────────────────────────────────────────────────────────
declare -A MODELS
MODELS[large-v3-turbo]="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin"
MODELS[distil-large-v3]="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-distil-large-v3.bin"

declare -A MODEL_FILES
MODEL_FILES[large-v3-turbo]="$MODEL_DIR/ggml-large-v3-turbo-q5_0.bin"
MODEL_FILES[distil-large-v3]="$MODEL_DIR/ggml-distil-large-v3.bin"

declare -A MODEL_SIZES
MODEL_SIZES[large-v3-turbo]="~547 MB"
MODEL_SIZES[distil-large-v3]="~756 MB"

# ── Colours ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Setup ──────────────────────────────────────────────────────────────────────
mkdir -p "$MODEL_DIR" "$RESULTS_DIR"

echo ""
echo -e "${BOLD}VoiceAssist V2 -- STT Benchmark${RESET}"
echo -e "${CYAN}whisper-cli: $WHISPER_BIN${RESET}"
echo ""

# ── Download models if missing ─────────────────────────────────────────────────
for name in "${!MODELS[@]}"; do
  file="${MODEL_FILES[$name]}"
  url="${MODELS[$name]}"
  size="${MODEL_SIZES[$name]}"

  if [[ -f "$file" ]]; then
    echo -e "${GREEN}✓${RESET} $name already downloaded"
  else
    echo -e "${YELLOW}↓${RESET} Downloading $name ($size)..."
    echo "  URL: $url"
    curl -L --progress-bar -o "$file" "$url"
    echo -e "${GREEN}✓${RESET} $name downloaded"
  fi
done

echo ""

# ── Audio input ────────────────────────────────────────────────────────────────
AUDIO_FILE="${1:-}"
TEMP_WAV=""

if [[ -n "$AUDIO_FILE" ]]; then
  if [[ ! -f "$AUDIO_FILE" ]]; then
    echo "ERROR: File not found: $AUDIO_FILE"
    exit 1
  fi
  echo -e "${CYAN}Using provided audio: $AUDIO_FILE${RESET}"
else
  TEMP_WAV="$RESULTS_DIR/benchmark-recording.wav"
  echo -e "${YELLOW}No audio file provided. Recording 30 seconds from your mic...${RESET}"
  echo "Speak clearly. Recording starts now."
  echo ""

  # rec is from SoX. Falls back to ffmpeg if SoX not installed.
  if command -v rec &>/dev/null; then
    rec -r 16000 -c 1 -b 16 "$TEMP_WAV" trim 0 30
  elif command -v ffmpeg &>/dev/null; then
    ffmpeg -f avfoundation -i ":0" -ar 16000 -ac 1 -t 30 "$TEMP_WAV" -y -loglevel error
  else
    echo "ERROR: Neither SoX (rec) nor ffmpeg is installed."
    echo "Install with: brew install sox   OR   brew install ffmpeg"
    echo "Or pass a WAV file: ./scripts/benchmark-stt.sh path/to/audio.wav"
    exit 1
  fi

  AUDIO_FILE="$TEMP_WAV"
  echo -e "${GREEN}✓${RESET} Recording saved."
fi

echo ""

# ── Run benchmark ──────────────────────────────────────────────────────────────
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RESULT_FILE="$RESULTS_DIR/benchmark-$TIMESTAMP.md"

declare -A TRANSCRIPTS
declare -A DURATIONS

for name in large-v3-turbo distil-large-v3; do
  model_file="${MODEL_FILES[$name]}"
  echo -e "${BOLD}Running $name...${RESET}"

  START_NS=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time()*1000')
  TRANSCRIPT=$("$WHISPER_BIN" \
    -m "$model_file" \
    -f "$AUDIO_FILE" \
    --language en \
    --no-timestamps \
    --output-txt \
    2>/dev/null || true)
  END_NS=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time()*1000')

  ELAPSED_MS=$(( END_NS - START_NS ))
  ELAPSED_S=$(echo "scale=1; $ELAPSED_MS / 1000" | bc)

  TRANSCRIPTS[$name]="$TRANSCRIPT"
  DURATIONS[$name]="${ELAPSED_S}s"

  echo -e "${GREEN}✓${RESET} Done in ${ELAPSED_S}s"
  echo ""
done

# ── Print results ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Results${RESET}"
echo -e "${BOLD}════════════════════════════════════════════${RESET}"
echo ""
echo -e "${CYAN}large-v3-turbo${RESET} (time: ${DURATIONS[large-v3-turbo]})"
echo "──────────────────────────────────────────"
echo "${TRANSCRIPTS[large-v3-turbo]}"
echo ""
echo -e "${CYAN}distil-large-v3${RESET} (time: ${DURATIONS[distil-large-v3]})"
echo "──────────────────────────────────────────"
echo "${TRANSCRIPTS[distil-large-v3]}"
echo ""
echo -e "${BOLD}Speed comparison:${RESET}"
echo "  large-v3-turbo:  ${DURATIONS[large-v3-turbo]}"
echo "  distil-large-v3: ${DURATIONS[distil-large-v3]}"
echo ""

# ── Write markdown results file ────────────────────────────────────────────────
cat > "$RESULT_FILE" <<EOF
# STT Benchmark Results

**Date:** $(date '+%d %B %Y %H:%M')
**Audio:** $AUDIO_FILE
**whisper-cli:** $WHISPER_BIN

## Speed

| Model | Time |
|-------|------|
| large-v3-turbo (q5_0) | ${DURATIONS[large-v3-turbo]} |
| distil-large-v3 | ${DURATIONS[distil-large-v3]} |

## Transcripts

### large-v3-turbo

${TRANSCRIPTS[large-v3-turbo]}

### distil-large-v3

${TRANSCRIPTS[distil-large-v3]}

## Notes

(Add your observations here -- accuracy, missed words, false starts, pauses handled correctly, etc.)
EOF

echo -e "${GREEN}Results saved to:${RESET}"
echo "  $RESULT_FILE"
echo ""
