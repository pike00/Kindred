"""Minimal faster-whisper transcription service.

Runs a FastAPI app that loads the base.en model on startup and exposes
a single POST /transcribe endpoint that accepts audio file uploads and
returns the transcribed text.
"""

import logging
import tempfile
from pathlib import Path

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Whisper Transcription Service")

# Load model on startup - base.en is small and fast
logger.info("Loading faster-whisper model 'base.en'...")
model = WhisperModel(
    "base.en",
    device="cpu",
    compute_type="int8",
)
logger.info("Model loaded successfully.")


@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    Transcribe an audio file and return the text.

    Accepts WAV, MP3, or any audio format supported by ffmpeg.
    Returns the transcribed text and optional language detection.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Save uploaded file to a temporary location
    suffix = Path(file.filename).suffix or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        logger.info(f"Transcribing file: {file.filename}")
        segments, info = model.transcribe(
            tmp_path,
            beam_size=5,
            language="en",  # Force English for speed
            vad_filter=True,  # Voice activity detection to skip silence
        )

        # Combine all segments into a single text
        transcription = " ".join(segment.text.strip() for segment in segments)

        logger.info(f"Transcription complete: {len(transcription)} characters")

        return JSONResponse(
            content={
                "text": transcription,
                "language": info.language if hasattr(info, "language") else "en",
                "duration": info.duration if hasattr(info, "duration") else None,
            }
        )

    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        raise HTTPException(
            status_code=500, detail=f"Transcription failed: {str(e)}"
        ) from e

    finally:
        # Clean up temporary file
        Path(tmp_path).unlink(missing_ok=True)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
