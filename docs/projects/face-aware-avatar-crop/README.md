---
title: Avatar Cropper with Face-Aware Crop
status: to_review
repos: [personal-crm]
started: 2026-04-21
last_updated: 2026-06-05
next_step: Choose face detection library (MediaPipe TFJS vs face-api.js) and create avatar upload component with face-aware crop UI
---

# Avatar Cropper with Face-Aware Crop

## Goal
Add a face-detection-powered avatar uploader to the contact form. When a user uploads a photo, run an in-browser face detector to automatically center a square crop on the largest detected face. Provide manual drag-to-adjust crop controls and a fallback center-crop for uploads without faces. Display cropped avatars using the existing ContactAvatar component's circular frame.

## Tasks
- [ ] Evaluate MediaPipe TFJS vs face-api.js: bundle size impact, WASM overhead, API ergonomics, browser compatibility
- [ ] Create AvatarUploadDialog component with file input, image preview, and async face detection on load
- [ ] Implement face detection logic: detect all faces, pick the largest by bounding box area, center a square crop on that face
- [ ] Build interactive crop UI: draggable square overlay with resize handles, real-time preview, manual fallback to center-crop
- [ ] Wire upload pipeline: canvas crop -> JPEG compression (quality tunable), POST to backend, update contact.avatar_url
- [ ] Add ContactAvatar integration: display placeholder fallback during upload, show uploaded photo in circular frame

## Session Log

### 2026-06-05
- Housekeeping: State reconciled during the tofix-remaining ship (v0.2.87 + v0.2.88 deployed to prod). No scope change to this project.

### 2026-04-21
- Project created.

### 2026-04-23
- README written; library selection and crop UI architecture pending.

## Notes

- **Face detection library tradeoffs:** MediaPipe TFJS (via @mediapipe/tasks-vision) includes WASM models (~2-5 MB gzipped for BlazeFace or full face detector) but offers native browser Face Detector API without extra setup. face-api.js is lighter on entry (~600 KB minified) but requires TensorFlow.js dependency and has less active maintenance. Recommended: start with MediaPipe for official support and feature completeness, migrate to face-api.js only if bundle size becomes a blocker (set threshold at 500 KB delta vs current React bundle).

- **WASM bundle strategy:** Defer WASM loading until upload dialog opens to avoid blocking initial page load. Use dynamic import: `const tasks = await import('@mediapipe/tasks-vision')` in a useEffect triggered by user intent.

- **Multi-face handling:** When multiple faces are detected, pick the one with the largest bounding box (most prominent in frame). Store all detected faces server-side (optional) for future ML features (e.g., "does avatar match contact?"). Log when zero faces detected to inform UI fallback.

- **Manual override always available:** Provide a "Manual Crop" toggle that switches from auto-detected square to free-form drag-to-position crop. Users who want to crop to a specific angle, partial face, or environment context must not be locked into auto-centering.

- **Crop square centering:** After detection, center the square on the face bounding box centroid, then constrain to image bounds. Square size: start at 60% of detected face width, allow resize down to 50% of face width to prevent over-cropping fine details.

- **JPEG compression on upload:** Client-side compress to 85-90% quality (tunable via config) before POST to reduce bandwidth and storage. Include quality param in request metadata so backend can optionally re-compress or log for analytics.

- **Fallback behavior:** If face detection fails, times out (set 5s max), or user declines detection, default to center-crop of largest inscribed square. No error state; seamless UX.

- **Avatar display:** ContactAvatar component is already rounded-full with size variants (sm/md/lg). Cropped avatars will display as-is in circular frame; ensure crop square is sized to minimize empty space in circle (document the math: for a circle of diameter D, inscribe a square of side ~0.707*D to maximize coverage).
