---
title: Voice-to-Text Interaction Capture
status: archived
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-06-10
next_step: Whisper transcription deps fixed; kindred-whisper image now built every release; shipped.
---

# Voice-to-Text Interaction Capture

## Goal
Enable users to quickly log interactions by voice while details are fresh. A hold-to-record button on the floating FAB captures audio, transcribes it via Whisper, and presents a draft Interaction for review and confirmation before saving.

## Tasks
- [ ] Implement MediaRecorder in browser on floating FAB component with hold-to-record UX
- [ ] Create /transcribe POST endpoint in FastAPI backend (accept WAV/MP3, return text)
- [ ] Deploy faster-whisper Docker container (base.en model for speed) in docker-compose
- [ ] Wire transcribed text into Interaction draft form with auto-populated narration field
- [ ] Build review-and-confirm modal for user to edit or cancel before save
- [ ] Test microphone permission flows and HTTPS/Traefik termination on homelab

## Session Log

### 2026-06-10
- Project archived.

### 2026-06-05
- Housekeeping: Whisper transcription deps fixed; kindred-whisper image now built every release; shipped.

### 2026-04-23
- Project created: README, handoffs directory.
- Scope: hold-to-record FAB button, local faster-whisper, Whisper transcription flow.

### 2026-04-21
- Project created.

## Notes
- **Hard dependency:** FAB floating action button and Interaction draft model must exist before voice capture can be wired in.
- **Whisper base.en model:** Use faster-whisper with `base.en` (smaller, faster) in a dedicated Docker Compose service. Do not store raw audio post-transcription (privacy).
- **Microphone permissions:** Browser getUserMedia requires HTTPS; homelab Traefik already terminates TLS, so no additional setup needed.
- **UX priority:** Hold-to-record with visual feedback (waveform or timer). Release to stop recording. Show spinner during transcription, then review modal.
- **No audio persistence:** Discard WAV/audio buffer immediately after successful transcription. Only store the text.
- **Test plan:** Manual iOS Safari + Android Chrome for microphone permission UX; verify Traefik TLS termination allows getUserMedia.
