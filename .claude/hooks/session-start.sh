#!/bin/bash
# Sets up the reel-editor skill in Claude Code cloud sessions.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Style config (name, tagline, theme) saved in the repo
mkdir -p "$HOME/.reel-editor"
cp "$CLAUDE_PROJECT_DIR/.reel-editor/config.json" "$HOME/.reel-editor/config.json"

# Python packages the skill needs
python3 -m pip install -q --disable-pip-version-check \
  pillow numpy arabic-reshaper python-bidi faster-whisper onnxruntime fonttools

# ffmpeg and an Arabic font for captions
need=()
command -v ffmpeg >/dev/null || need+=(ffmpeg)
[ -f /usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf ] || need+=(fonts-noto-core)
if [ ${#need[@]} -gt 0 ]; then
  apt-get update -q >/dev/null
  DEBIAN_FRONTEND=noninteractive apt-get install -y -q "${need[@]}" >/dev/null
fi

# Person-mask model used by matte.py
if [ ! -s "$HOME/.u2net/u2net_human_seg.onnx" ]; then
  mkdir -p "$HOME/.u2net"
  curl -sSfL -o "$HOME/.u2net/u2net_human_seg.onnx" \
    https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2net_human_seg.onnx
fi

# Whisper model (needs huggingface.co allowed in the network settings; skipped if blocked)
timeout 300 python3 -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')" \
  >/dev/null 2>&1 || echo "reel-editor: Whisper model not downloaded (is huggingface.co allowed?)" >&2
