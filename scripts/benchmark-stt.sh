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
URL_TURBO="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin"
URL_DISTIL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-distil-large-v3.bin"
FILE_TURBO="$MODEL_DIR/ggml-large-v3-turbo-q5_0.bin"
FILE_DISTIL="$MODEL_DIR/ggml-distil-large-v3.bin"

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
if [[ -f "$FILE_TURBO" ]]; then
  echo -e "${GREEN}checkmark${RESET} large-v3-turbo already downloaded"
else
  echo -e "${YELLOW}Downloading large-v3-turbo (~547 MB)...${RESET}"
  curl -L --progress-bar -o "$FILE_TURBO" "$URL_TURBO"
  echo -e "${GREEN}checkmark${RESET} large-v3-turbo downloaded"
fi

if [[ -f "$FILE_DISTIL" ]]; then
  echo -e "${GREEN}checkmark${RESET} distil-large-v3 already downloaded"
else
  echo -e "${YELLOW}Downloading distil-large-v3 (~756 MB)...${RESET}"
  curl -L --progress-bar -o "$FILE_DISTIL" "$URL_DISTIL"
  echo -e "${GREEN}checkmark${RESET} distil-large-v3 downloaded"
fi

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

  if command -v rec &>/dev/null; then
    rec -r 16000 -c 1 -b 16 "$TEMP_WAV" trim 0 30
  elif command -v ffmpeg &>/dev/null; then
    ffmpeg -f avfoundation -i ":0" -ar 16000 -ac 1 -t 30 "$TEMP_WAV" -y -loglevel error
  else
    echo "ERROR: Neither SoX (rec) nor ffmpeg is installed."
    exit 1
  fi

  AUDIO_FILE="$TEMP_WAV"
  echo -e "${GREEN}checkmark${RESET} Recording saved."
fi

echo ""

# ── Run benchmark ──────────────────────────────────────────────────────────────
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RESULT_FILE="$RESULTS_DIR/benchmark-$TIMESTAMP.md"

echo -e "${BOLD}Running large-v3-turbo...${RESET}"
START_MS=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time()*1000')
TRANSCRIPT_TURBO=$("$WHISPER_BIN" -m "$FILE_TURBO" -f "$AUDIO_FILE" --language en --no-timestamps --output-txt 2>/dev/null || true)
END_MS=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time()*1000')
DURATION_TURBO=$(echo "scale=1; ($END_MS - $START_MS) / 1000" | bc)s
echo -e "${GREEN}checkmark${RESET} Done in $DURATION_TURBO"
echo ""

echo -e "${BOLD}Running distil-large-v3...${RESET}"
START_MS=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time()*1000')
TRANSCRIPT_DISTIL=$("$WHISPER_BIN" -m "$FILE_DISTIL" -f "$AUDIO_FILE" --language en --no-timestamps --output-txt 2>/dev/null || true)
END_MS=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time()*1000')
DURATION_DISTIL=$(echo "scale=1; ($END_MS - $START_MS) / 1000" | bc)s
echo -e "${GREEN}checkmark${RESET} Done in $DURATION_DISTIL"
echo ""

# ── Print results ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}============================================${RESET}"
echo -e "${BOLD}  Results${RESET}"
echo -e "${BOLD}============================================${RESET}"
echo ""
echo -e "${CYAN}large-v3-turbo${RESET} (time: $DURATION_TURBO)"
echo "------------------------------------------"
echo "$TRANSCRIPT_TURBO"
echo ""
echo -e "${CYAN}distil-large-v3${RESET} (time: $DURATION_DISTIL)"
echo "------------------------------------------"
echo "$TRANSCRIPT_DISTIL"
echo ""
echo -e "${BOLD}Speed comparison:${RESET}"
echo "  large-v3-turbo:  $DURATION_TURBO"
echo "  distil-large-v3: $DURATION_DISTIL"
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
| large-v3-turbo (q5_0) | $DURATION_TURBO |
| distil-large-v3 | $DURATION_DISTIL |

## Transcripts

### large-v3-turbo

$TRANSCRIPT_TURBO

### distil-large-v3

$TRANSCRIPT_DISTIL

## Notes

(Add your observations here -- accuracy, missed words, false starts, pauses handled correctly, etc.)
EOF

echo -e "${GREEN}Results saved to:${RESET}"
echo "  $RESULT_FILE"
echo ""
